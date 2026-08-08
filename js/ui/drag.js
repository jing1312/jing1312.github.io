/* ==========================================================================
   drag.js — 物理拖拽（Act 5 · 分子态）
   自己写积分器，不引物理库：
     · 拖拽时 1:1 跟手，同时记录角速度
     · 松手后按角速度惯性继续转，指数阻尼
     · 静置 0.9s 后弹簧回归到初始朝向（临界阻尼式 slerp，不会来回荡）
   只在指针真的落在主体屏幕投影圆内（或落在分子说明面板上）时接管，
   否则一律放行——绝不抢滚动。
   ========================================================================== */

import * as THREE from "three";

const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const INTERACTIVE = "a, button, input, textarea, select, summary, [contenteditable]";

export function createDrag({ getEnabled, getCircle, onState }) {
  const q = new THREE.Quaternion();
  const rest = new THREE.Quaternion();
  const tmp = new THREE.Quaternion();
  const vel = { x: 0, y: 0 };

  let dragging = false;
  let pid = null;
  let last = { x: 0, y: 0, t: 0 };
  let idle = 0;
  let hovering = false;

  const S = 0.0072;          // px → rad
  const DAMP = 1.9;          // 惯性衰减（1/s）
  const REST_DELAY = 0.9;    // 秒
  const REST_RATE = 0.85;

  function spin(ax, ay) {
    tmp.setFromAxisAngle(AY, ay); q.premultiply(tmp);
    tmp.setFromAxisAngle(AX, ax); q.premultiply(tmp);
    q.normalize();
  }

  function inside(x, y) {
    const c = getCircle?.();
    if (!c) return false;
    return (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r * c.r;
  }
  function onPanel(t) {
    return !!(t && t.closest && t.closest("#mol-panel"));
  }

  function down(e) {
    if (!getEnabled()) return;
    if (e.target?.closest?.(INTERACTIVE)) return;
    if (e.pointerType !== "mouse" && e.isPrimary === false) return;
    if (!inside(e.clientX, e.clientY) && !onPanel(e.target)) return;

    dragging = true;
    pid = e.pointerId;
    last = { x: e.clientX, y: e.clientY, t: performance.now() };
    vel.x = vel.y = 0;
    idle = 0;
    document.body.classList.add("is-dragging");
    onState?.({ dragging: true, hovering: true });
    if (e.cancelable) e.preventDefault();
  }

  function move(e) {
    if (!dragging) {
      // 悬停态：只为了让光标切成「拖动」提示
      const h = getEnabled() && (inside(e.clientX, e.clientY) || onPanel(e.target));
      if (h !== hovering) { hovering = h; onState?.({ dragging: false, hovering: h }); }
      return;
    }
    if (e.pointerId !== pid) return;
    const now = performance.now();
    const dt = Math.max((now - last.t) / 1000, 1 / 240);
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    spin(dy * S, dx * S);
    // 速度做一次平滑，避免最后一帧的抖动决定甩出方向
    vel.x = vel.x * 0.45 + (dy * S / dt) * 0.55;
    vel.y = vel.y * 0.45 + (dx * S / dt) * 0.55;
    last = { x: e.clientX, y: e.clientY, t: now };
    idle = 0;
    if (e.cancelable) e.preventDefault();
  }

  function up(e) {
    if (!dragging || (pid !== null && e.pointerId !== pid)) return;
    dragging = false;
    pid = null;
    document.body.classList.remove("is-dragging");
    onState?.({ dragging: false, hovering });
  }

  window.addEventListener("pointerdown", down, { passive: false });
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up, { passive: true });
  window.addEventListener("pointercancel", up, { passive: true });

  return {
    quaternion: q,
    get dragging() { return dragging; },
    get hovering() { return hovering; },

    /** 主体形态切换时重设静止朝向。 */
    setRest(quat) { rest.copy(quat); },

    update(dt) {
      if (dragging) return;

      const sp = Math.hypot(vel.x, vel.y);
      if (sp > 1e-4) {
        spin(vel.x * dt, vel.y * dt);
        const k = Math.exp(-DAMP * dt);
        vel.x *= k; vel.y *= k;
        idle = 0;
      } else {
        idle += dt;
      }

      // 弹簧回归：延迟启动，速率随时间爬升，收尾干净
      if (idle > REST_DELAY) {
        const ramp = Math.min((idle - REST_DELAY) / 1.2, 1);
        const t = 1 - Math.exp(-REST_RATE * ramp * dt * 3.0);
        q.slerp(rest, t);
      }
    },
  };
}
