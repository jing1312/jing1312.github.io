"""快速视觉巡检：逐幕滚动截图，供 agent 自检用。

用法:  python3 qa/survey.py [w] [h] [outdir] [tier]
tier 默认 0（High 档）——视觉自检必须看用户在真机上看到的那一档，
SwiftShader 慢一点无所谓，反正是静态截图。
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

W = int(sys.argv[1]) if len(sys.argv) > 1 else 1440
H = int(sys.argv[2]) if len(sys.argv) > 2 else 900
HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else HERE / "survey"
TIER = int(sys.argv[4]) if len(sys.argv) > 4 else 0
URL = f"http://127.0.0.1:8765/index.html?tier={TIER}&qa=1"
ACTS = ["act-hero", "act-thesis", "act-p1", "act-p2", "act-p3", "act-closing"]


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--enable-unsafe-swiftshader", "--use-gl=swiftshader",
                                    "--disable-lcd-text"])
        pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(URL, wait_until="load", timeout=120_000)
        pg.wait_for_function("() => window.__site && window.__site.ready", timeout=120_000)
        pg.wait_for_timeout(2500)
        for i, a in enumerate(ACTS):
            pg.evaluate(
                "(id) => { const el = document.getElementById(id);"
                " window.scrollTo({top: el.offsetTop + el.offsetHeight/2 - innerHeight/2,"
                " behavior: 'auto'}); }", a)
            pg.wait_for_timeout(1800)
            st = pg.evaluate("() => ({m: window.__site.morph, t: window.__site.tone,"
                             " a: window.__site.act})")
            pg.screenshot(path=str(OUT / f"{i}_{a}_{W}x{H}.png"))
            print(f"  {a:<12} morph={st['m']:.3f} tone={st['t']:<8} act={st['a']}")
        b.close()
    print(f"errors: {len(errs)}")
    for e in errs[:10]:
        print("  ", e[:400])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
