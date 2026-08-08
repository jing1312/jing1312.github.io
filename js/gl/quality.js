/* ==========================================================================
   quality.js — 自适应降质
   规则（滚动窗口取中位数，不是瞬时帧率，避免单帧尖刺误判）：
     High → Mid   中位 FPS < 45 持续 2s
     Mid  → Low   中位 FPS < 25 持续 2s
     回升         中位 FPS > 55 持续 5s，只上调一档，且整场只回升一次
   移动端起始档 = Mid。
   这套机制与 prefers-reduced-motion 完全独立：那是用户意愿，这是硬件现实。
   ========================================================================== */

export const TIERS = [
  { name: "high", samples: 9, fbo: 1.00, detail: 5, shadow: 0.55, transition: true },
  { name: "mid",  samples: 5, fbo: 0.75, detail: 4, shadow: 0.45, transition: true },
  { name: "low",  samples: 3, fbo: 0.50, detail: 3, shadow: 0.00, transition: false },
];

const WINDOW = 90;         // 采样帧数（约 1.5s @60fps）
const DOWN_HOLD = 2.0;     // 秒
const UP_HOLD = 5.0;       // 秒

function median(arr, n) {
  const s = arr.slice(0, n).sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) * 0.5;
}

export function createQuality({ startTier = 0, onChange } = {}) {
  const buf = new Float64Array(WINDOW);
  let filled = 0, head = 0;
  let tier = startTier;
  let downTimer = 0, upTimer = 0;
  let upgradesLeft = 1;
  let frozen = false;

  function apply(next, reason) {
    if (next === tier) return;
    tier = next;
    downTimer = upTimer = 0;
    filled = 0; head = 0;                 // 换档后重新观察，避免抖动
    onChange?.(TIERS[tier], tier, reason);
  }

  return {
    get tier() { return tier; },
    get spec() { return TIERS[tier]; },
    /** 供 QA 注入：直接锁档。 */
    freeze(t) { frozen = true; apply(t, "forced"); },
    unfreeze() { frozen = false; },

    /** 每帧调用，dt 单位秒。 */
    tick(dt) {
      if (dt <= 0 || dt > 1) return;      // 跳过标签页切回来的巨大间隔
      buf[head] = 1 / dt;
      head = (head + 1) % WINDOW;
      filled = Math.min(filled + 1, WINDOW);
      if (frozen || filled < 30) return;

      const fps = median(buf, filled);

      // 降档
      const lowThresh = tier === 0 ? 45 : 25;
      if (tier < TIERS.length - 1 && fps < lowThresh) {
        downTimer += dt;
        if (downTimer >= DOWN_HOLD) { apply(tier + 1, `fps ${fps.toFixed(1)}`); return; }
      } else {
        downTimer = 0;
      }

      // 回升
      if (tier > 0 && upgradesLeft > 0 && fps > 55) {
        upTimer += dt;
        if (upTimer >= UP_HOLD) { upgradesLeft--; apply(tier - 1, `fps ${fps.toFixed(1)}`); }
      } else {
        upTimer = 0;
      }
    },

    debug() {
      return { tier, name: TIERS[tier].name, fps: filled >= 30 ? median(buf, filled) : null };
    },
  };
}

/** 触屏 / 低核心数设备起步就降一档，别等掉帧了才反应。 */
export function initialTier() {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const cores = navigator.hardwareConcurrency || 4;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (coarse || narrow || cores <= 4) return 1;
  return 0;
}
