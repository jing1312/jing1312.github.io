"""冒烟测试：加载页面，抓 JS / GLSL / 网络报错，并导出字形使用清单。

用法:  python3 qa/smoke.py [url]
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/index.html?qa=1"
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
# 开发布局是 <root>/{site,qa,tools}，交付布局是仓库根直接放站点文件。
# 认 index.html 在哪就算哪，两种都能跑。
SITE = ROOT / "site" if (ROOT / "site" / "index.html").exists() else ROOT
OUT = HERE
OUT.mkdir(parents=True, exist_ok=True)

# 遍历所有文本节点，按「计算后的字体族 + 字重」把字符分桶。
# 这样字体子集完全由页面实际渲染决定，不靠人工维护字符表。
GLYPH_JS = r"""
() => {
  const buckets = {};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
  let n;
  while ((n = walker.nextNode())) {
    const txt = n.nodeValue;
    if (!txt || !txt.trim()) continue;
    const el = n.parentElement;
    if (!el || skip.has(el.tagName)) continue;
    const cs = getComputedStyle(el);
    const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const w = parseInt(cs.fontWeight, 10) || 400;
    const style = cs.fontStyle;
    const key = `${fam}|${w}|${style}`;
    (buckets[key] ||= new Set());
    for (const ch of txt) buckets[key].add(ch);
  }
  // noscript 内容不在 DOM 文本流里，单独补
  const ns = document.querySelector("noscript");
  if (ns) {
    (buckets["SC Display|900|normal"] ||= new Set());
    (buckets["Plex|400|normal"] ||= new Set());
    for (const ch of ns.textContent) {
      buckets["SC Display|900|normal"].add(ch);
      buckets["Plex|400|normal"].add(ch);
    }
  }
  const out = {};
  for (const [k, v] of Object.entries(buckets)) out[k] = [...v].sort().join("");
  return out;
}
"""


def main() -> int:
    errors, warnings, requests_failed = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=[
                "--enable-unsafe-swiftshader",
                "--use-gl=swiftshader",
                "--disable-lcd-text",
            ]
        )
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda m: (errors if m.type == "error" else warnings).append(m.text))
        page.on("pageerror", lambda e: errors.append("PAGEERROR " + str(e)))
        page.on("requestfailed", lambda r: requests_failed.append(f"{r.url} :: {r.failure}"))

        page.goto(URL, wait_until="load", timeout=120_000)
        try:
            page.wait_for_function("() => window.__site && window.__site.ready", timeout=120_000)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"__site never ready: {exc}")

        page.wait_for_timeout(4000)
        info = page.evaluate(
            "() => window.__site ? {"
            "webgl: window.__site.webgl, reduced: window.__site.reduced,"
            "morph: window.__site.morph, rendering: window.__site.rendering,"
            "booting: document.body.classList.contains('is-booting'),"
            "sections: document.querySelectorAll('main > section').length,"
            "projects: document.querySelectorAll('.project').length,"
            "navLinks: document.querySelectorAll('#primary-nav a').length"
            "} : null"
        )
        glyphs = page.evaluate(GLYPH_JS)
        page.screenshot(path=str(OUT / "smoke.png"))
        browser.close()

    (OUT / "glyphs.json").write_text(json.dumps(glyphs, ensure_ascii=False, indent=1), encoding="utf-8")

    print("site state:", json.dumps(info, ensure_ascii=False))
    print("\nglyph buckets:")
    for k, v in sorted(glyphs.items()):
        print(f"  {k:34s} {len(v):5d} chars")
    print(f"\nconsole errors: {len(errors)}")
    for e in errors[:40]:
        print("  ERR", e[:1400])
    print(f"failed requests: {len(requests_failed)}")
    for r in requests_failed[:20]:
        print("  REQ", r)
    print(f"warnings: {len(warnings)}")
    for w in warnings[:10]:
        print("  WARN", w[:300])
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
