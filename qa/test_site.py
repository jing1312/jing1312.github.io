"""Jingjing 个人主页 —— 交付前正式 QA（T1–T8）。

用法:
    python3 qa/test_site.py [--base URL] [--out DIR]

产出:
    <out>/shots/*.png      18 张截图（6 幕 × 3 视口）+ 兜底/降级态截图
    <out>/qa_report.json   机器可读结果
    <out>/qa_report.md     人读摘要

每项测试返回 (name, passed, detail)。退出码 = 失败项数。
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import time
from dataclasses import dataclass, field
from pathlib import Path

from playwright.sync_api import sync_playwright

# --------------------------------------------------------------------------- 配置

ACTS = ["act-hero", "act-about", "act-projects", "act-contact"]
VIEWPORTS = [(1920, 1080), (1440, 900), (390, 844)]

# SwiftShader 软栅格：真机跑 GPU，这里只是为了在容器里出图。
GL_ARGS = ["--enable-unsafe-swiftshader", "--use-gl=swiftshader", "--disable-lcd-text"]
NOGL_ARGS = ["--disable-gpu", "--disable-software-rasterizer", "--disable-lcd-text"]

# GitHub API 实测（2026-08-09）：12 个公开仓库 = 11 非 fork + 1 fork。
# 两个 IELTS 仓库不进站点（一个是 fork，一个是练习件）。
ALLOWED_REPOS = {
    "nature-figure-skill", "svg-optimization-skill", "daily-digital-twin",
    "jing1312", "skipping-lectures", "access-jingtujiaoxue", "baidu-ai-batch",
    "xiangzhang-course-pipeline", "flashcard-pharm", "TCM-Study-Materials",
    "IELTS_player_practice_jing",
}
FORBIDDEN_REPOS = {"IELTS-practice"}          # fork，绝不出现
UPSTREAM = "Yuan1z0825/nature-skills"          # nature-figure-skill 必须署上游

FONT_BUDGET_KB = 3000.0                      # 字体按字形子集化，站点本体加起来约 2MB 磁盘
CRITICAL_BUDGET_KB = 250.0                    # 首屏关键资源，不含 three.js


@dataclass
class Result:
    name: str
    passed: bool
    detail: str
    data: dict = field(default_factory=dict)


def _boot(pg, url: str, timeout: int = 120_000, expect_gl: bool = True) -> None:
    pg.goto(url, wait_until="load", timeout=timeout)
    pg.wait_for_function("() => window.__site && window.__site.ready", timeout=timeout)
    pg.wait_for_timeout(2200 if expect_gl else 900)


def _scroll_to_act(pg, act_id: str, settle: int = 1600) -> None:
    pg.evaluate(
        "(id) => { const el = document.getElementById(id);"
        " window.scrollTo({top: el.offsetTop + el.offsetHeight / 2 - innerHeight / 2,"
        " behavior: 'auto'}); }", act_id)
    pg.wait_for_timeout(settle)


# --------------------------------------------------------------------------- T1

def t1_cold_boot(browser, base: str) -> Result:
    """冷启动：零 uncaught error、零失败请求、六幕 DOM 齐全。"""
    errs, failed = [], []
    pg = browser.new_page(viewport={"width": 1440, "height": 900})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(f"console: {m.text}") if m.type == "error" else None)
    pg.on("requestfailed", lambda r: failed.append(f"{r.url} :: {r.failure}"))
    _boot(pg, f"{base}?tier=0&qa=1")
    present = pg.evaluate("(ids) => ids.filter((i) => !!document.getElementById(i))", ACTS)
    state = pg.evaluate("() => window.__site && ({webgl: window.__site.webgl,"
                        " ready: window.__site.ready, act: window.__site.act,"
                        " tone: window.__site.tone, chainSpin: window.__site.chainSpin})")
    pg.close()
    ok = not errs and not failed and len(present) == len(ACTS) and state and state["webgl"]
    return Result("T1 冷启动", ok,
                  f"errors={len(errs)} failedRequests={len(failed)} "
                  f"acts={len(present)}/{len(ACTS)} webgl={state and state['webgl']}",
                  {"errors": errs[:10], "failed": failed[:10], "state": state})


# --------------------------------------------------------------------------- T2

def t2_screenshots(browser, base: str, shots: Path) -> Result:
    """6 幕 × 3 视口 = 18 张截图，同时断言无横向溢出。"""
    shots.mkdir(parents=True, exist_ok=True)
    made, overflow, errs = [], [], []
    for w, h in VIEWPORTS:
        pg = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        _boot(pg, f"{base}?tier=0&qa=1")
        for i, act in enumerate(ACTS):
            _scroll_to_act(pg, act)
            path = shots / f"{w}x{h}_{i}_{act}.png"
            pg.screenshot(path=str(path))
            made.append(path.name)
            ov = pg.evaluate("() => document.documentElement.scrollWidth - "
                             "document.documentElement.clientWidth")
            if ov > 1:
                # 找出到底是谁溢出的，报告里直接给出选择器
                who = pg.evaluate(
                    "() => { const lim = document.documentElement.clientWidth; const out = [];"
                    " document.querySelectorAll('body *').forEach((el) => {"
                    "   const r = el.getBoundingClientRect();"
                    "   if (r.width > 0 && r.right > lim + 1 && el.children.length === 0)"
                    "     out.push((el.className || el.tagName) + ' right=' + Math.round(r.right));"
                    " }); return out.slice(0, 6); }")
                overflow.append({"viewport": f"{w}x{h}", "act": act, "overflowPx": ov,
                                 "elements": who})
        pg.close()
    ok = len(made) == len(ACTS) * len(VIEWPORTS) and not overflow and not errs
    return Result("T2 三视口截图 + 横向溢出", ok,
                  f"shots={len(made)}/18 overflowCases={len(overflow)} errors={len(errs)}",
                  {"overflow": overflow, "errors": errs[:5]})


# --------------------------------------------------------------------------- T3

def t3_tone_anchors(browser, base: str) -> Result:
    """四幕色调锚点：每幕中心处 body[data-tone] 必须精确落在注册表的值。"""
    want_tones = {"act-hero": "paper", "act-about": "blue",
                  "act-projects": "amber", "act-contact": "magenta"}
    pg = browser.new_page(viewport={"width": 1440, "height": 900})
    _boot(pg, f"{base}?tier=0&qa=1")
    rows, ok = [], True
    for act, want in want_tones.items():
        _scroll_to_act(pg, act)
        got = pg.evaluate("() => document.body.dataset.tone")
        good = got == want
        ok = ok and good
        rows.append({"act": act, "want": want, "got": got, "pass": good})
    pg.close()
    return Result("T3 色调锚点", ok,
                  " ".join(f"{r['act']}={r['got']}(want {r['want']})" for r in rows),
                  {"anchors": rows})


# --------------------------------------------------------------------------- T4

def t4_quality_downgrade(browser, base: str) -> Result:
    """注入伪造低 FPS：应从 High 降到 Mid/Low，且不来回抖动。

    ?tier=0 只是把起点钉在 High（容器里是 1 核软栅格，initialTier() 会自己起在 Mid，
    测不到 High→Mid 这一跳）。它同时会 freeze 住档位，所以喂帧前必须 unfreeze，
    否则测的是「锁档功能」而不是「降质逻辑」。
    喂帧量要够：quality.js 需要先攒满 30 帧窗口，再连续 2s 低于阈值才降档，
    20fps 下 = 30 + 40 = 70 tick，feedFps(20, 5) 给 100 tick 才够。
    """
    pg = browser.new_page(viewport={"width": 1440, "height": 900})
    _boot(pg, f"{base}?tier=0")          # 不加 qa=1，让降质逻辑真正生效
    start = pg.evaluate("() => ({tier: window.__site.tier, name: window.__site.tierName})")
    pg.evaluate("() => window.__site.quality.unfreeze()")
    pg.evaluate("() => window.__site.feedFps(20, 5)")
    pg.wait_for_timeout(600)
    after_low = pg.evaluate("() => ({tier: window.__site.tier, name: window.__site.tierName,"
                            " samples: window.__site.samples, fbo: window.__site.fboScale})")
    # 抖动检查：再喂一次同样的低 FPS，档位不应继续来回跳
    trace = []
    for _ in range(4):
        pg.evaluate("() => window.__site.feedFps(20, 1)")
        pg.wait_for_timeout(250)
        trace.append(pg.evaluate("() => window.__site.tier"))
    pg.close()
    dropped = after_low["tier"] > start["tier"]
    stable = len(set(trace)) <= 2 and trace == sorted(trace)   # 只许单调下降，不许反复横跳
    return Result("T4 自适应降质", dropped and stable,
                  f"{start['name']} -> {after_low['name']} "
                  f"(samples={after_low['samples']} fbo={after_low['fbo']}) trace={trace}",
                  {"start": start, "after": after_low, "trace": trace})


# --------------------------------------------------------------------------- T5

def t5_no_webgl(playwright, base: str, shots: Path) -> Result:
    """无 WebGL 兜底：body.no-webgl，六幕文字内容 100% 可读。"""
    b = playwright.chromium.launch(args=NOGL_ARGS)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    _boot(pg, f"{base}?qa=1", expect_gl=False)
    info = pg.evaluate(
        "() => ({ noWebgl: document.body.classList.contains('no-webgl'),"
        "  webgl: window.__site.webgl,"
        "  acts: [...document.querySelectorAll('.act')].length,"
        "  hidden: [...document.querySelectorAll('.act')]"
        "            .filter((a) => getComputedStyle(a).display === 'none').length,"
        "  textLen: document.body.innerText.replace(/\\s+/g, '').length })")
    pg.screenshot(path=str(shots / "fallback_no-webgl.png"), full_page=False)
    pg.close(); b.close()
    ok = (info["noWebgl"] or not info["webgl"]) and info["acts"] == 4 \
        and info["hidden"] == 0 and info["textLen"] > 1500 and not errs
    return Result("T5 无 WebGL 兜底", ok,
                  f"no-webgl={info['noWebgl']} acts={info['acts']} hiddenActs={info['hidden']} "
                  f"textChars={info['textLen']} errors={len(errs)}", info)


# --------------------------------------------------------------------------- T6

def t6_reduced_motion(browser, base: str, shots: Path) -> Result:
    """prefers-reduced-motion：链珠动画冻结、内容不缺。"""
    ctx = browser.new_context(viewport={"width": 1440, "height": 900},
                              reduced_motion="reduce")
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    _boot(pg, base)
    _scroll_to_act(pg, "act-projects")
    info = pg.evaluate(
        "() => { const t0 = window.__site.chainSpin;"
        "  return {spin: t0, tone: document.body.dataset.tone,"
        "  cards: document.querySelectorAll('.card').length}; }")
    pg.wait_for_timeout(700)
    drift = pg.evaluate("(m) => Math.abs(window.__site.chainSpin - m)", info["spin"])
    pg.screenshot(path=str(shots / "reduced-motion_act-projects.png"))
    ctx.close()
    ok = drift < 1e-9 and info["cards"] >= 6 and not errs
    return Result("T6 reduced-motion", ok,
                  f"spinDrift={drift:.2e} cards={info['cards']} errors={len(errs)}",
                  {"spin": info["spin"], "drift": drift, "errors": errs[:5]})


# --------------------------------------------------------------------------- T7

def t7_weight(browser, base: str, site_dir: Path) -> Result:
    """资源预算，按**实际下行字节**算，不是磁盘字节。

    本地 http.server 不压缩，GitHub Pages 压缩。用 min(raw, gzip-9) 近似真实线上传输量：
    HTML/CSS/JS 会被压掉 ~3-4 倍，woff2 已经是压缩容器、gzip 不再变小。
    口径：字体总量 <400KB；首屏关键资源（含全部字体、不含 three.js）<250KB。
    three.js 单列——它是渐进增强，无 WebGL 的用户根本不下载后续渲染路径。
    """
    fonts = sorted((site_dir / "fonts").glob("*.woff2"))
    font_kb = sum(f.stat().st_size for f in fonts) / 1024

    seen: dict[str, tuple[int, int]] = {}          # url -> (raw, wire)
    pg = browser.new_page(viewport={"width": 1440, "height": 900})

    def on_response(r):
        try:
            if r.request.resource_type in ("document", "stylesheet", "script", "font", "fetch",
                                           "xhr", "image"):
                body = r.body()
                seen[r.url] = (len(body), min(len(body), len(gzip.compress(body, 9))))
        except Exception:
            pass

    pg.on("response", on_response)
    _boot(pg, f"{base}?tier=0&qa=1")
    pg.close()

    three_kb = sum(v[1] for k, v in seen.items() if "/vendor/three/" in k) / 1024
    critical_kb = sum(v[1] for k, v in seen.items() if "/vendor/three/" not in k) / 1024
    raw_kb = sum(v[0] for v in seen.values()) / 1024
    ok = font_kb < FONT_BUDGET_KB and critical_kb < CRITICAL_BUDGET_KB
    breakdown = {k.split("8765/")[-1].split("?")[0]: round(v[1] / 1024, 1)
                 for k, v in sorted(seen.items(), key=lambda x: -x[1][1])}
    return Result("T7 资源预算", ok,
                  f"fonts={font_kb:.1f}KB/<{FONT_BUDGET_KB:.0f} "
                  f"critical(gzip, excl three)={critical_kb:.1f}KB/<{CRITICAL_BUDGET_KB:.0f} "
                  f"three(gzip)={three_kb:.1f}KB total(raw)={raw_kb:.1f}KB",
                  {"fontKB": round(font_kb, 1), "criticalGzipKB": round(critical_kb, 1),
                   "threeGzipKB": round(three_kb, 1), "totalRawKB": round(raw_kb, 1),
                   "wireBreakdownKB": breakdown,
                   "fonts": {f.name: f.stat().st_size for f in fonts}})


# --------------------------------------------------------------------------- T8

def t8_content(browser, base: str) -> Result:
    """内容完整性：仓库名白名单、fork 不得出现、上游归属必须在站内。"""
    pg = browser.new_page(viewport={"width": 1440, "height": 900})
    _boot(pg, f"{base}?qa=1", expect_gl=False)
    text = pg.evaluate("() => document.body.innerText")
    hrefs = pg.evaluate("() => [...document.querySelectorAll('a[href]')].map((a) => a.href)")
    pg.close()

    # 站内出现的 jing1312 仓库名
    mentioned = set()
    for h in hrefs:
        m = re.match(r"https://github\.com/jing1312/([A-Za-z0-9._-]+)/?$", h)
        if m:
            mentioned.add(m.group(1))
    for name in ALLOWED_REPOS | FORBIDDEN_REPOS:
        if re.search(rf"(?<![\w-]){re.escape(name)}(?![\w-])", text):
            mentioned.add(name)

    unknown = sorted(mentioned - ALLOWED_REPOS)
    forbidden = sorted(mentioned & FORBIDDEN_REPOS)
    attr_ok = "nature-skills" in text                                   # 上游以文字方式署在项目卡里
    no_contact = not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)     # 用户要求不放联系方式
    no_pub = "Publications" not in text and "论文列表" not in text

    ok = not unknown and not forbidden and attr_ok and no_contact and no_pub
    return Result("T8 内容完整性", ok,
                  f"repos={len(mentioned)} unknown={unknown} forbidden={forbidden} "
                  f"upstreamAttribution={attr_ok} noEmail={no_contact} noPublications={no_pub}",
                  {"mentioned": sorted(mentioned), "unknown": unknown,
                   "forbidden": forbidden, "attribution": attr_ok})


# --------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8765/index.html")
    here = Path(__file__).resolve().parent
    root = here.parent
    # 开发布局 <root>/{site,qa}；交付布局仓库根直接放站点文件。两种都认。
    site_default = root / "site" if (root / "site" / "index.html").exists() else root
    ap.add_argument("--out", default=str(here))
    ap.add_argument("--site", default=str(site_default))
    args = ap.parse_args()

    out = Path(args.out)
    shots = out / "shots"
    shots.mkdir(parents=True, exist_ok=True)
    site_dir = Path(args.site)

    results: list[Result] = []
    t_start = time.time()
    with sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        for fn, kwargs in [
            (t1_cold_boot, {}),
            (t2_screenshots, {"shots": shots}),
            (t3_morph_anchors, {}),
            (t4_quality_downgrade, {}),
            (t6_reduced_motion, {"shots": shots}),
            (t7_weight, {"site_dir": site_dir}),
            (t8_content, {}),
        ]:
            try:
                results.append(fn(b, args.base, **kwargs))
            except Exception as exc:                      # noqa: BLE001
                results.append(Result(fn.__name__, False, f"EXCEPTION {type(exc).__name__}: {exc}"))
            print(f"  {'PASS' if results[-1].passed else 'FAIL'}  {results[-1].name}"
                  f"  —  {results[-1].detail}")
        b.close()

        try:
            r5 = t5_no_webgl(p, args.base, shots)
        except Exception as exc:                          # noqa: BLE001
            r5 = Result("T5 无 WebGL 兜底", False, f"EXCEPTION {type(exc).__name__}: {exc}")
        results.insert(4, r5)
        print(f"  {'PASS' if r5.passed else 'FAIL'}  {r5.name}  —  {r5.detail}")

    results.sort(key=lambda r: r.name)
    failed = [r for r in results if not r.passed]
    elapsed = time.time() - t_start

    (out / "qa_report.json").write_text(json.dumps(
        {"passed": len(results) - len(failed), "total": len(results),
         "elapsedSec": round(elapsed, 1),
         "results": [{"name": r.name, "pass": r.passed, "detail": r.detail, "data": r.data}
                     for r in results]},
        ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [f"# QA 报告 — Jingjing 个人主页", "",
             f"{len(results) - len(failed)} / {len(results)} 通过 · 用时 {elapsed:.0f}s", "",
             "| 测试 | 结果 | 说明 |", "| --- | --- | --- |"]
    lines += [f"| {r.name} | {'PASS' if r.passed else 'FAIL'} | {r.detail} |" for r in results]
    (out / "qa_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\n{len(results) - len(failed)}/{len(results)} passed in {elapsed:.0f}s")
    return len(failed)


if __name__ == "__main__":
    raise SystemExit(main())
