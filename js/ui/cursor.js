/* ==========================================================================
   cursor.js — 自定义光标 + 磁吸
   规则：
     · 只在精确指针（鼠标/触控板）下启用；触屏与 prefers-reduced-motion 下完全不接管
     · 键盘用户不受影响：:focus-visible 描边始终存在，系统光标只在 has-cursor 时隐藏
     · 磁吸是双向的：元素被吸向光标，光标环也被吸向元素中心
   同时把光标位置以 uv 形式喂给玻璃着色器（uPointer），做局部透镜扰动。
   ========================================================================== */

import { damp, prefersReducedMotion } from "../util/anim.js";

const PAD = 40;         // 磁吸感应半径（元素外扩像素）
const PULL = 0.30;      // 元素被吸过去的比例
const MAX_PULL = 15;    // 元素最大位移（px）

export function createCursor() {
  const el = document.getElementById("cursor");
  const dot = el?.querySelector(".cursor__dot");
  const ring = el?.querySelector(".cursor__ring");
  const label = el?.querySelector(".cursor__label");

  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const enabled = !!el && !coarse && !prefersReducedMotion();

  const raw = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  const dotP = { ...raw };
  const ringP = { ...raw };
  const uv = { x: 9, y: 9 };            // 屏外 = 玻璃不做透镜扰动

  let magnets = [];
  let rects = [];
  let tick = 0;
  let active = null;
  let forcedLabel = null;
  let dragMode = false;
  let seen = false;

  function collect() {
    magnets = [...document.querySelectorAll(".magnet")];
    measure();
  }
  function measure() {
    rects = magnets.map((m) => m.getBoundingClientRect());
  }

  if (enabled) {
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      raw.x = e.clientX; raw.y = e.clientY;
      if (!seen) { seen = true; document.body.classList.add("has-cursor"); }
    }, { passive: true });

    window.addEventListener("pointerdown", () => el.classList.add("is-press"), { passive: true });
    window.addEventListener("pointerup", () => el.classList.remove("is-press"), { passive: true });
    window.addEventListener("blur", () => {
      document.body.classList.remove("has-cursor");
      seen = false;
    });
    window.addEventListener("resize", measure, { passive: true });
  }

  return {
    enabled,
    uv,

    /** 内容渲染完成后调用一次，收集磁吸目标。 */
    refresh() { if (enabled) collect(); },

    /** 外部强制的光标文案（例如 Act 5 的「拖动」）。传 null 取消。 */
    setLabel(text) { forcedLabel = text || null; },
    setDrag(on) { dragMode = !!on; },

    update(dt) {
      if (!enabled) return;

      // 每 6 帧重测一次矩形：滚动中也能跟上，又不至于每帧强制回流
      if ((tick++ % 6) === 0) measure();

      // --- 找当前磁吸目标 ---
      active = null;
      let bestD = Infinity;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.width === 0) continue;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = Math.max(r.left - PAD - raw.x, 0, raw.x - (r.right + PAD));
        const dy = Math.max(r.top - PAD - raw.y, 0, raw.y - (r.bottom + PAD));
        if (dx === 0 && dy === 0) {
          const d = (raw.x - cx) ** 2 + (raw.y - cy) ** 2;
          if (d < bestD) { bestD = d; active = { el: magnets[i], cx, cy }; }
        }
      }

      // --- 元素被吸过去 ---
      for (const m of magnets) {
        if (active && m === active.el) continue;
        if (m.style.transform) m.style.transform = "";
      }
      let ringTx = raw.x, ringTy = raw.y;
      if (active) {
        const ox = Math.max(-MAX_PULL, Math.min(MAX_PULL, (raw.x - active.cx) * PULL));
        const oy = Math.max(-MAX_PULL, Math.min(MAX_PULL, (raw.y - active.cy) * PULL));
        active.el.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0)`;
        // 光标环也被吸回元素中心：这才是双向磁吸
        ringTx = raw.x + (active.cx + ox - raw.x) * 0.45;
        ringTy = raw.y + (active.cy + oy - raw.y) * 0.45;
      }

      // --- 阻尼跟随（点跟得紧，环跟得松，拉出速度感） ---
      dotP.x = damp(dotP.x, raw.x, 0.016, dt);
      dotP.y = damp(dotP.y, raw.y, 0.016, dt);
      ringP.x = damp(ringP.x, ringTx, 0.055, dt);
      ringP.y = damp(ringP.y, ringTy, 0.055, dt);

      dot.style.transform = `translate3d(${dotP.x.toFixed(2)}px, ${dotP.y.toFixed(2)}px, 0)`;
      ring.style.transform = `translate3d(${ringP.x.toFixed(2)}px, ${ringP.y.toFixed(2)}px, 0)`;
      el.style.transform = "translate3d(0,0,0)";

      const txt = forcedLabel || (active ? (active.el.dataset.cursor || "打开 ↗") : "");
      if (label.textContent !== txt) label.textContent = txt;
      el.classList.toggle("is-labelled", !!txt);
      el.classList.toggle("is-magnet", !!active && !dragMode);
      el.classList.toggle("is-drag", dragMode);

      // 光标 label 跟着 ring 走
      label.style.transform = `translate3d(${ringP.x.toFixed(2)}px, ${ringP.y.toFixed(2)}px, 0)`;

      uv.x = raw.x / Math.max(window.innerWidth, 1);
      uv.y = 1 - raw.y / Math.max(window.innerHeight, 1);
    },
  };
}
