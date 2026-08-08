"""Jingjing portfolio V2 delivery QA.

Run with a static server already listening on port 8765:
    python qa/test_site.py
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

VIEWPORTS = [(1440, 900), (768, 1024), (390, 844)]
SHOT_TARGETS = [
    "home", "principles", "project-daily-digital-twin", "project-skipping-lectures",
    "project-svg-optimization-skill", "research", "more", "closing",
]
GL_ARGS = ["--enable-unsafe-swiftshader", "--use-gl=swiftshader", "--disable-lcd-text"]

ALLOWED_REPOS = {
    "nature-figure-skill", "svg-optimization-skill", "daily-digital-twin",
    "skipping-lectures", "access-jingtujiaoxue", "baidu-ai-batch",
    "xiangzhang-course-pipeline", "flashcard-pharm", "TCM-Study-Materials",
}
FORBIDDEN_REPOS = {"IELTS-practice"}
UPSTREAM = "Yuan1z0825/nature-skills"
FONT_BUDGET_KB = 400.0
CRITICAL_BUDGET_KB = 250.0


@dataclass
class Result:
    name: str
    passed: bool
    detail: str
    data: dict = field(default_factory=dict)


def _boot(page, url: str, timeout: int = 60_000) -> None:
    page.goto(url, wait_until="load", timeout=timeout)
    page.wait_for_function("window.__site && window.__site.ready", timeout=timeout)
    page.wait_for_timeout(500)


def _scroll(page, element_id: str, settle: int = 350) -> None:
    page.evaluate(
        "id => { const el = document.getElementById(id);"
        " const y = el.getBoundingClientRect().top + window.scrollY;"
        " document.documentElement.style.scrollBehavior = 'auto';"
        " window.scrollTo(0, Math.max(0, y - 92)); }",
        element_id,
    )
    page.wait_for_timeout(settle)


def t1_cold_boot(browser, base: str) -> Result:
    errors, failed = [], []
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed.append(f"{request.url}: {request.failure}"))
    _boot(page, f"{base}?qa=1")
    state = page.evaluate("({webgl: __site.webgl, rendering: __site.rendering, morph: __site.morph})")
    counts = {
        "sections": page.locator("main > section").count(),
        "projects": page.locator(".project").count(),
        "nav": page.locator("#primary-nav a").count(),
    }
    page.close()
    ok = not errors and not failed and state["webgl"] and counts == {"sections": 5, "projects": 3, "nav": 5}
    return Result("T1 冷启动", ok,
                  f"errors={len(errors)} failed={len(failed)} webgl={state['webgl']} counts={counts}",
                  {"errors": errors[:10], "failed": failed[:10], "state": state, "counts": counts})


def t2_responsive(browser, base: str, shots: Path) -> Result:
    shots.mkdir(parents=True, exist_ok=True)
    overflow, overlaps, errors, made = [], [], [], []
    for width, height in VIEWPORTS:
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
        page.on("pageerror", lambda error: errors.append(str(error)))
        _boot(page, f"{base}?qa=1")
        for target in SHOT_TARGETS:
            _scroll(page, target)
            path = shots / f"{width}x{height}_{target}.png"
            page.screenshot(path=str(path))
            made.append(path.name)
            delta = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if delta > 1:
                overflow.append({"viewport": f"{width}x{height}", "target": target, "px": delta})
        _scroll(page, "home")
        overlap = page.evaluate("""() => {
          const a = document.querySelector('.hero__copy').getBoundingClientRect();
          const b = document.querySelector('.hero__visual').getBoundingClientRect();
          return Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left)) *
                 Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
        }""")
        if overlap > 1:
            overlaps.append({"viewport": f"{width}x{height}", "area": overlap})
        page.close()
    expected = len(VIEWPORTS) * len(SHOT_TARGETS)
    ok = len(made) == expected and not overflow and not overlaps and not errors
    return Result("T2 响应式截图", ok,
                  f"shots={len(made)}/{expected} overflow={len(overflow)} heroOverlap={len(overlaps)} errors={len(errors)}",
                  {"overflow": overflow, "overlaps": overlaps, "errors": errors[:5]})


def t3_morph(browser, base: str) -> Result:
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    _boot(page, f"{base}?qa=1")
    start = page.evaluate("__site.morph")
    page.evaluate("window.scrollTo(0, document.getElementById('home').offsetHeight * .62)")
    page.wait_for_timeout(300)
    end = page.evaluate("__site.morph")
    page.close()
    ok = start <= .05 and end >= .7
    return Result("T3 Evidence Core 形变", ok, f"start={start:.3f} end={end:.3f}", {"start": start, "end": end})


def t4_render_lifecycle(browser, base: str) -> Result:
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    _boot(page, base)
    top = page.evaluate("__site.rendering")
    _scroll(page, "research", settle=800)
    away = page.evaluate("__site.rendering")
    page.close()
    ok = bool(top) and not away
    return Result("T4 3D 生命周期", ok, f"heroRendering={top} awayRendering={away}")


def t5_no_webgl(browser, base: str, shots: Path) -> Result:
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    _boot(page, f"{base}?qa=1&no-webgl=1")
    info = page.evaluate("""() => ({
      webgl: __site.webgl,
      noWebgl: document.body.classList.contains('no-webgl'),
      poster: getComputedStyle(document.querySelector('.core-poster')).display,
      projects: document.querySelectorAll('.project').length,
      text: document.body.innerText.replace(/\s+/g, '').length
    })""")
    page.screenshot(path=str(shots / "fallback_no-webgl.png"))
    page.close()
    ok = not info["webgl"] and info["noWebgl"] and info["poster"] != "none" \
        and info["projects"] == 3 and info["text"] > 1800 and not errors
    return Result("T5 无 WebGL 降级", ok,
                  f"noWebgl={info['noWebgl']} poster={info['poster']} projects={info['projects']} text={info['text']} errors={len(errors)}",
                  {"info": info, "errors": errors})


def t6_reduced_motion(browser, base: str, shots: Path) -> Result:
    context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    page = context.new_page()
    _boot(page, base)
    first = page.evaluate("({reduced: __site.reduced, morph: __site.morph, hidden: [...document.querySelectorAll('.reveal')].filter(e => getComputedStyle(e).opacity === '0').length})")
    page.wait_for_timeout(600)
    second = page.evaluate("__site.morph")
    page.screenshot(path=str(shots / "reduced-motion.png"))
    context.close()
    ok = first["reduced"] and first["hidden"] == 0 and abs(second - first["morph"]) < 1e-6
    return Result("T6 reduced-motion", ok,
                  f"reduced={first['reduced']} hidden={first['hidden']} drift={abs(second-first['morph']):.2e}", first)


def t7_weight(browser, base: str, site_dir: Path) -> Result:
    fonts = sorted((site_dir / "fonts").glob("*.woff2"))
    font_kb = sum(path.stat().st_size for path in fonts) / 1024
    seen: dict[str, tuple[int, int]] = {}
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    def collect(response):
        try:
            if response.request.resource_type in {"document", "stylesheet", "script", "font", "fetch", "image"}:
                body = response.body()
                seen[response.url] = (len(body), min(len(body), len(gzip.compress(body, 9))))
        except Exception:
            pass

    page.on("response", collect)
    _boot(page, f"{base}?qa=1")
    page.close()
    three_kb = sum(value[1] for url, value in seen.items() if "/vendor/three/" in url) / 1024
    critical_kb = sum(value[1] for url, value in seen.items() if "/vendor/three/" not in url) / 1024
    ok = font_kb < FONT_BUDGET_KB and critical_kb < CRITICAL_BUDGET_KB
    return Result("T7 资源预算", ok,
                  f"fonts={font_kb:.1f}KB critical={critical_kb:.1f}KB three={three_kb:.1f}KB",
                  {"fontKB": font_kb, "criticalKB": critical_kb, "threeKB": three_kb})


def t8_content(browser, base: str) -> Result:
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    _boot(page, f"{base}?qa=1&no-webgl=1")
    text = page.evaluate("document.body.innerText")
    hrefs = page.evaluate("[...document.querySelectorAll('a[href]')].map(a => a.href)")
    page.close()
    mentioned = set()
    for href in hrefs:
        match = re.match(r"https://github\.com/jing1312/([A-Za-z0-9._-]+)/?$", href)
        if match:
            mentioned.add(match.group(1))
    unknown = sorted(mentioned - ALLOWED_REPOS)
    forbidden = sorted(mentioned & FORBIDDEN_REPOS)
    attribution = UPSTREAM in text and f"https://github.com/{UPSTREAM}" in hrefs
    no_email = not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    required = all(token in text for token in ["132", "153", "146", "122", "55+", "青蒿素"])
    ok = not unknown and not forbidden and attribution and no_email and required
    return Result("T8 内容完整性", ok,
                  f"repos={len(mentioned)} unknown={unknown} forbidden={forbidden} attribution={attribution} noEmail={no_email} required={required}",
                  {"mentioned": sorted(mentioned)})


def t9_mobile_menu(browser, base: str) -> Result:
    page = browser.new_page(viewport={"width": 390, "height": 844})
    _boot(page, f"{base}?qa=1")
    button = page.locator(".menu-toggle")
    button.click()
    opened = page.evaluate("({expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), open: document.querySelector('#primary-nav').classList.contains('is-open')})")
    page.keyboard.press("Escape")
    closed = page.evaluate("({expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), open: document.querySelector('#primary-nav').classList.contains('is-open')})")
    page.close()
    ok = opened == {"expanded": "true", "open": True} and closed == {"expanded": "false", "open": False}
    return Result("T9 移动导航", ok, f"opened={opened} closed={closed}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8765/index.html")
    parser.add_argument("--out", default=str(Path(__file__).resolve().parent))
    parser.add_argument("--site", default=str(Path(__file__).resolve().parent.parent))
    args = parser.parse_args()
    out = Path(args.out)
    shots = out / "shots"
    shots.mkdir(parents=True, exist_ok=True)
    started = time.time()
    results: list[Result] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(args=GL_ARGS)
        tests = [
            (t1_cold_boot, {}),
            (t2_responsive, {"shots": shots}),
            (t3_morph, {}),
            (t4_render_lifecycle, {}),
            (t5_no_webgl, {"shots": shots}),
            (t6_reduced_motion, {"shots": shots}),
            (t7_weight, {"site_dir": Path(args.site)}),
            (t8_content, {}),
            (t9_mobile_menu, {}),
        ]
        for function, kwargs in tests:
            try:
                result = function(browser, args.base, **kwargs)
            except Exception as error:  # noqa: BLE001
                result = Result(function.__name__, False, f"EXCEPTION {type(error).__name__}: {error}")
            results.append(result)
            print(f"  {'PASS' if result.passed else 'FAIL'}  {result.name} — {result.detail}")
        browser.close()

    elapsed = time.time() - started
    failed = [result for result in results if not result.passed]
    report = {
        "passed": len(results) - len(failed),
        "total": len(results),
        "elapsedSec": round(elapsed, 1),
        "results": [{"name": result.name, "pass": result.passed, "detail": result.detail, "data": result.data} for result in results],
    }
    (out / "qa_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = ["# QA 报告 — Jingjing 个人主页 V2", "", f"{report['passed']} / {report['total']} 通过 · 用时 {elapsed:.0f}s", "", "| 测试 | 结果 | 说明 |", "| --- | --- | --- |"]
    lines.extend(f"| {result.name} | {'PASS' if result.passed else 'FAIL'} | {result.detail} |" for result in results)
    (out / "qa_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n{report['passed']}/{report['total']} passed in {elapsed:.0f}s")
    return len(failed)


if __name__ == "__main__":
    raise SystemExit(main())
