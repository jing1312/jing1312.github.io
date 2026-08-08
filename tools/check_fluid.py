"""Numerically验证流体态流场的两条性质，再把参数写进 morph.js。

  1. div v == 0（严格无散度 → 不会出现汇点，流线不会塌成一个黑点）
  2. r = R 处 v·x̂ == 0（严格切向 → 流线永远出不了玻璃壳）

构造：v = ∇ × (g(r) · P(kx))，其中 P 是 ABC 场，满足 Beltrami 恒等式 ∇×P = k·P。
展开：v = g(r)·k·P + g'(r)·(x̂ × P)
g(R) = 0 ⇒ 边界上 v = g'(R)(x̂ × P) ⊥ x̂。
"""
import numpy as np

KA, KB, KC = np.sqrt(2.0), 1.0, np.sqrt(3.0)
K = 1.55
R = 0.84


def P(o):
    x, y, z = o * K
    return np.array([
        KA * np.sin(z) + KC * np.cos(y),
        KB * np.sin(x) + KA * np.cos(z),
        KC * np.sin(y) + KB * np.cos(x),
    ])


def g(r):
    t = r / R
    return (1.0 - t * t) ** 2


def gp(r):
    t = r / R
    return 2.0 * (1.0 - t * t) * (-2.0 * r / (R * R))


def vel(o):
    r = np.linalg.norm(o)
    p = P(o)
    v = g(r) * K * p
    if r > 1e-9:
        v = v + gp(r) * np.cross(o / r, p)
    return v


rng = np.random.default_rng(0)

# --- 1. 数值散度 ---
h = 1e-5
divs = []
for _ in range(4000):
    o = rng.normal(size=3)
    o *= (rng.random() ** (1 / 3)) * R * 0.98 / np.linalg.norm(o)
    d = 0.0
    for a in range(3):
        e = np.zeros(3); e[a] = h
        d += (vel(o + e)[a] - vel(o - e)[a]) / (2 * h)
    divs.append(abs(d))
divs = np.array(divs)

# --- 2. 边界法向分量 ---
rad = []
for _ in range(4000):
    o = rng.normal(size=3)
    o *= R / np.linalg.norm(o)
    rad.append(abs(np.dot(vel(o), o / R)))
rad = np.array(rad)

# --- 3. 实际积分：最大半径 + 停滞比例 ---
H = 0.032
STEPS, LINES = 50, 48


def unit(o, sign):
    v = vel(o)
    n = np.linalg.norm(v)
    return (v / n if n > 1e-9 else np.array([0.0, 1.0, 0.0])) * sign


def step(p, sign):
    v1 = unit(p, sign)
    v2 = unit(p + v1 * H * 0.5, sign)
    return p + v2 * H


maxr, speeds = 0.0, []
for _ in range(LINES):
    o = rng.normal(size=3)
    o *= (rng.random() ** (1 / 3)) * 0.78 * R / np.linalg.norm(o)
    p = o.copy()
    for _ in range(STEPS // 2):
        p = step(p, -1)
    for _ in range(STEPS):
        speeds.append(np.linalg.norm(vel(p)))
        p = step(p, 1)
        maxr = max(maxr, np.linalg.norm(p))
speeds = np.array(speeds)

print(f"div  : max={divs.max():.3e}  mean={divs.mean():.3e}   (应 ~1e-5 量级数值噪声)")
print(f"n·v@R: max={rad.max():.3e}  mean={rad.mean():.3e}   (应 ~0)")
print(f"积分 : max|p|={maxr:.4f}  (壳 R={R})  越界={'YES' if maxr > R + 1e-6 else 'no'}")
print(f"速度 : p05={np.percentile(speeds,5):.3f}  中位={np.median(speeds):.3f}  max={speeds.max():.3f}")
print(f"       近停滞点占比(<2%中位) = {(speeds < 0.02*np.median(speeds)).mean():.4f}")
