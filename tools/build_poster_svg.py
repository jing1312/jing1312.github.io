"""生成无 WebGL 兜底态用的刻面晶体线框 SVG（内联进 index.html，零额外请求）。

为什么不是位图：兜底态要跟着六幕换色（--field / --fg），位图做不到；
为什么不是 radial-gradient 光球：用户自己的 svg-optimization-skill 明令禁止
「随机光球」。这里画的是真实主体的同一个几何——正二十面体，
前向面棱线重、背向面棱线轻，靠遮挡关系读出体积，不靠发光。
"""
from __future__ import annotations

import math

PHI = (1 + 5 ** 0.5) / 2

# --- 正二十面体：12 顶点 / 30 棱 / 20 面 -------------------------------------
V = [
    (-1, PHI, 0), (1, PHI, 0), (-1, -PHI, 0), (1, -PHI, 0),
    (0, -1, PHI), (0, 1, PHI), (0, -1, -PHI), (0, 1, -PHI),
    (PHI, 0, -1), (PHI, 0, 1), (-PHI, 0, -1), (-PHI, 0, 1),
]
F = [
    (0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
    (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
    (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
    (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1),
]


def norm(v):
    n = math.dist((0, 0, 0), v)
    return (v[0] / n, v[1] / n, v[2] / n)


def rot(v, ax, ay):
    x, y, z = v
    x, z = x * math.cos(ay) + z * math.sin(ay), -x * math.sin(ay) + z * math.cos(ay)
    y, z = y * math.cos(ax) - z * math.sin(ax), y * math.sin(ax) + z * math.cos(ax)
    return (x, y, z)


def build(size: int = 200, ax: float = -0.42, ay: float = 0.62) -> str:
    pts = [rot(norm(v), ax, ay) for v in V]
    R = size * 0.44
    cx = cy = size / 2

    def p2(i):
        x, y, z = pts[i]
        return (cx + x * R, cy - y * R)

    front, back = set(), set()
    for f in F:
        a, b, c = (pts[i] for i in f)
        u = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
        w = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
        nz = u[0] * w[1] - u[1] * w[0]
        tgt = front if nz > 0 else back
        for e in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            tgt.add(tuple(sorted(e)))
    back -= front

    def path(edges):
        out = []
        for i, j in sorted(edges):
            (x1, y1), (x2, y2) = p2(i), p2(j)
            out.append(f"M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}")
        return "".join(out)

    return (
        f'<svg class="poster__gem" viewBox="0 0 {size} {size}" fill="none" '
        f'stroke="currentColor" stroke-linecap="round" aria-hidden="true">'
        f'<circle cx="{cx}" cy="{cy}" r="{R:.1f}" opacity=".22" stroke-width="1"/>'
        f'<path d="{path(back)}" opacity=".16" stroke-width="1"/>'
        f'<path d="{path(front)}" opacity=".46" stroke-width="1.4"/>'
        f"</svg>"
    )


if __name__ == "__main__":
    svg = build()
    print(len(svg), "bytes")
    print(svg)
