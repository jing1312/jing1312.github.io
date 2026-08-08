/* ==========================================================================
   anim.js — 极简缓动 / 阻尼 / 补间。刻意不引 GSAP：
   全站唯一的第三方运行时依赖是 three.js。
   ========================================================================== */

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (b === a ? 0 : clamp((v - a) / (b - a)));
export const smoothstep = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smootherstep = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };

/** 帧率无关的指数阻尼。halflife 单位为秒。 */
export function damp(current, target, halflife, dt) {
  if (halflife <= 0) return target;
  return target + (current - target) * Math.pow(2, -dt / halflife);
}

export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** 一次性补间，返回可取消的句柄。 */
export function tween({ from = 0, to = 1, duration = 600, ease = easeOutExpo, onUpdate, onDone }) {
  let raf = 0;
  const t0 = performance.now();
  const step = (now) => {
    const t = clamp((now - t0) / duration);
    onUpdate?.(from + (to - from) * ease(t), t);
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** 一次性触发的 IntersectionObserver 封装。 */
export function onceVisible(el, cb, { threshold = 0.35, rootMargin = "0px" } = {}) {
  if (!("IntersectionObserver" in window)) { cb(); return () => {}; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { cb(); io.disconnect(); break; }
  }, { threshold, rootMargin });
  io.observe(el);
  return () => io.disconnect();
}

export const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** ?qa=1 时冻结时间与随机种子，保证截图可重复。 */
export const qaMode = () => new URLSearchParams(location.search).get("qa") === "1";

/** 确定性伪随机（mulberry32），用于可重复的粒子/顶点扰动。 */
export function seededRandom(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
