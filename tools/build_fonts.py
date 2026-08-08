#!/usr/bin/env python3
"""
Subset + instance the web fonts for the Jingjing site.

Reads the measured glyph-usage buckets in qa/glyphs.json (produced by qa/smoke.py,
which walks the rendered DOM and records which characters are painted with which
computed font stack / weight / style), then produces the eight woff2 files that
css/type.css declares.

Sources live in fontsrc/ (see FONT SOURCES below). Everything is OFL.

Run:  python3 tools/build_fonts.py
"""

from __future__ import annotations

import json
import pathlib
import sys
import unicodedata
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "fontsrc"
SITE = ROOT / "site" if (ROOT / "site" / "index.html").exists() else ROOT
OUT = SITE / "fonts"
GLYPHS = ROOT / "qa" / "glyphs.json"

BUDGET_BYTES = 400 * 1024

# --------------------------------------------------------------------------
# FONT SOURCES —— 全部 OFL。源文件合计 ~35 MB，不进仓库；缺哪个就现下哪个。
#   Bodoni Moda      https://github.com/google/fonts/tree/main/ofl/bodonimoda
#   Noto Sans SC     https://github.com/google/fonts/tree/main/ofl/notosanssc
#   IBM Plex Sans    https://github.com/google/fonts/tree/main/ofl/ibmplexsans
#   IBM Plex Mono    https://github.com/google/fonts/tree/main/ofl/ibmplexmono
#   IBM Plex Sans SC https://github.com/IBM/plex  packages/plex-sans-sc
#     ↑ Plex Sans SC 不在 Google Fonts，只有 IBM 官方仓库有；commit 已 pin 死。
# --------------------------------------------------------------------------

GF = "https://raw.githubusercontent.com/google/fonts/main/ofl"
PLEX_COMMIT = "bf260093582f04622aacc1e9f9ca604d7ccd0c42"
PLEX_SC = (f"https://raw.githubusercontent.com/IBM/plex/{PLEX_COMMIT}"
           "/packages/plex-sans-sc/fonts/complete/ttf/unhinted")

SOURCE_URLS = {
    "BodoniModa[opsz,wght].ttf":        f"{GF}/bodonimoda/BodoniModa%5Bopsz,wght%5D.ttf",
    "BodoniModa-Italic[opsz,wght].ttf": f"{GF}/bodonimoda/BodoniModa-Italic%5Bopsz,wght%5D.ttf",
    "NotoSansSC[wght].ttf":             f"{GF}/notosanssc/NotoSansSC%5Bwght%5D.ttf",
    "IBMPlexSans[wdth,wght].ttf":       f"{GF}/ibmplexsans/IBMPlexSans%5Bwdth,wght%5D.ttf",
    "IBMPlexMono-Regular.ttf":          f"{GF}/ibmplexmono/IBMPlexMono-Regular.ttf",
    "IBMPlexMono-SemiBold.ttf":         f"{GF}/ibmplexmono/IBMPlexMono-SemiBold.ttf",
    "IBMPlexSansSC-Regular.ttf":        f"{PLEX_SC}/IBMPlexSansSC-Regular.ttf",
    "IBMPlexSansSC-SemiBold.ttf":       f"{PLEX_SC}/IBMPlexSansSC-SemiBold.ttf",
}


def ensure_source(name: str) -> pathlib.Path:
    """源文件不在就下载。仓库里只留子集化后的 woff2。"""
    path = SRC / name
    if path.exists() and path.stat().st_size > 0:
        return path
    url = SOURCE_URLS.get(name)
    if not url:
        sys.exit(f"unknown font source: {name}")
    SRC.mkdir(parents=True, exist_ok=True)
    print(f"  fetch {name} …", flush=True)
    with urllib.request.urlopen(url, timeout=120) as r:
        path.write_bytes(r.read())
    return path

ASCII = "".join(chr(c) for c in range(0x20, 0x7F))

# Punctuation / symbols that may appear in either script run. Cheap insurance
# against a later copy edit introducing a glyph we did not measure.
SYMBOLS = "\u00a9\u00b0\u00b7\u00d7\u2013\u2014\u2018\u2019\u201c\u201d\u2026" \
          "\u2192\u2197\u2264\u2265\u2260\u2605\u2081\u2082\u2085\u00b1\u2044"
CJK_PUNCT = "\u3001\u3002\u300a\u300b\u300c\u300d\u300e\u300f\uff08\uff09" \
            "\uff0c\uff1a\uff1b\uff1f\uff01\u2014\u2026\u00b7\uff05\uff0f"


def is_cjk(ch: str) -> bool:
    o = ord(ch)
    return (
        0x2E80 <= o <= 0x9FFF
        or 0x3400 <= o <= 0x4DBF
        or 0xF900 <= o <= 0xFAFF
        or 0xFF00 <= o <= 0xFFEF
        or 0x3000 <= o <= 0x303F
    )


def load_buckets() -> dict[str, str]:
    if not GLYPHS.exists():
        sys.exit(f"missing {GLYPHS}; run qa/smoke.py first")
    return json.loads(GLYPHS.read_text(encoding="utf-8"))


def split(chars: str) -> tuple[set[str], set[str]]:
    cjk = {c for c in chars if is_cjk(c)}
    latin = {c for c in chars if not is_cjk(c) and c.strip()}
    return cjk, latin


def instance(path: pathlib.Path, pins: dict[str, float]) -> TTFont:
    font = TTFont(path)
    if "fvar" in font:
        axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in font["fvar"].axes}
        print(f"    axes {axes}")
        pins = {k: v for k, v in pins.items() if k in axes}
        font = instancer.instantiateVariableFont(font, pins, inplace=True, optimize=True)
    return font


def build(tag: str, src: str, pins: dict[str, float], charset: set[str], out_name: str) -> int:
    print(f"  [{tag}] {src}  {len(charset)} chars")
    font = instance(ensure_source(src), pins)

    opts = subset.Options()
    opts.flavor = "woff2"
    opts.with_zopfli = False
    opts.desubroutinize = True
    opts.hinting = False
    opts.legacy_kern = False
    opts.name_IDs = [1, 2, 3, 4, 5, 6, 13, 14]
    opts.name_legacy = False
    opts.notdef_outline = False
    opts.recalc_bounds = True
    opts.layout_features = ["ccmp", "locl", "kern", "liga", "calt", "mark", "mkmk", "tnum", "case"]
    opts.drop_tables += ["DSIG", "MVAR", "STAT", "VDMX", "hdmx", "LTSH", "PCLT", "vhea", "vmtx"]

    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(unicodes=[ord(c) for c in charset])
    subsetter.subset(font)

    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / out_name
    font.flavor = "woff2"
    font.save(dest)
    font.close()
    size = dest.stat().st_size
    print(f"    -> {out_name}  {size/1024:.1f} KB")
    return size


def main() -> None:
    b = load_buckets()

    cjk_all: set[str] = set()
    latin_all: set[str] = set()
    per: dict[str, tuple[set[str], set[str]]] = {}
    for key, chars in b.items():
        c, l = split(chars)
        per[key] = (c, l)
        cjk_all |= c
        latin_all |= l

    body_400 = per.get("Plex|400|normal", (set(), set()))[0] | per.get("Plex Mono|400|normal", (set(), set()))[0]
    body_600 = per.get("Plex|600|normal", (set(), set()))[0] | per.get("Plex Mono|600|normal", (set(), set()))[0]
    disp_900 = per.get("SC Display|900|normal", (set(), set()))[0]

    # The 400 face is the CJK workhorse (body + mono labels + any fallback), so it
    # carries the full measured union. 600/900 carry only what they actually set.
    body_400 |= cjk_all
    body_600 |= set(CJK_PUNCT)
    disp_900 |= set(CJK_PUNCT)

    latin_core = set(ASCII) | set(SYMBOLS) | latin_all
    bodoni_core = set(ASCII) | {"\u2014", "\u00b7", "\u2019", "\u201c", "\u201d", "\u2013"}
    bodoni_core |= per.get("Bodoni Display|900|normal", (set(), set()))[1]
    bodoni_core |= per.get("Bodoni Display|900|italic", (set(), set()))[1]

    print(f"measured: cjk union {len(cjk_all)}, latin union {len(latin_all)}")
    print(f"  body400 cjk {len(body_400)} | body600 cjk {len(body_600)} | disp900 cjk {len(disp_900)}")

    total = 0
    print("\nDisplay latin - Bodoni Moda")
    total += build("bodoni-900", "BodoniModa[opsz,wght].ttf", {"wght": 900, "opsz": 72},
                   bodoni_core, "bodonimoda-900.woff2")
    total += build("bodoni-900i", "BodoniModa-Italic[opsz,wght].ttf", {"wght": 900, "opsz": 72},
                   bodoni_core, "bodonimoda-900-italic.woff2")

    print("\nDisplay CJK - Noto Sans SC Black")
    total += build("notosc-900", "NotoSansSC[wght].ttf", {"wght": 900},
                   disp_900, "notosanssc-900.woff2")

    print("\nBody latin - IBM Plex Sans")
    total += build("plex-400", "IBMPlexSans[wdth,wght].ttf", {"wght": 400, "wdth": 100},
                   latin_core, "plexsans-400.woff2")
    total += build("plex-600", "IBMPlexSans[wdth,wght].ttf", {"wght": 600, "wdth": 100},
                   latin_core, "plexsans-600.woff2")

    print("\nBody CJK - IBM Plex Sans SC")
    total += build("plexsc-400", "IBMPlexSansSC-Regular.ttf", {},
                   body_400, "plexsanssc-400.woff2")
    total += build("plexsc-600", "IBMPlexSansSC-SemiBold.ttf", {},
                   body_600, "plexsanssc-600.woff2")

    print("\nMono - IBM Plex Mono")
    total += build("mono-400", "IBMPlexMono-Regular.ttf", {},
                   latin_core, "plexmono-400.woff2")
    total += build("mono-600", "IBMPlexMono-SemiBold.ttf", {},
                   latin_core, "plexmono-600.woff2")

    print("\n" + "=" * 52)
    print(f"total {total/1024:.1f} KB  (budget {BUDGET_BYTES/1024:.0f} KB)")
    for f in sorted(OUT.glob("*.woff2")):
        print(f"  {f.name:<30} {f.stat().st_size/1024:7.1f} KB")
    if total > BUDGET_BYTES:
        print("OVER BUDGET")
        sys.exit(1)
    print("within budget")


if __name__ == "__main__":
    main()
