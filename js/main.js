/* ==========================================================================
   main.js — 引导 + 幕次状态机
   职责边界：
     content.js 管文案；render.js 管 DOM；gl/* 管画面；这里只管「什么时候变成什么」。

   滚动是原生的（没有惯性劫持——用户明确没勾这项）。所有 3D 状态都是滚动位置的
   纯函数：同一个滚动位置永远得到同一帧。
   ========================================================================== */

import * as THREE from "three";
import * as C from "./content.js";
import { renderAll } from "./ui/render.js";
import { buildChain } from "./gl/chain.js";
import { createScene } from "./gl/scene.js";
import { createQuality, initialTier } from "./gl/quality.js";
import { createCursor } from "./ui/cursor.js";
import { clamp, damp, smootherstep, easeOutExpo, onceVisible, prefersReducedMotion, qaMode } from "./util/anim.js";

/* --------------------------------------------------------------------------
   每一幕的取景
   玻璃链在 Hero 正中央；之后在左右两侧来回换位，给版面让出舞台。
   串珠链整体高约 2.4（链长约 2.44），scale = 1 时几乎撑满视口高度。
   -------------------------------------------------------------------------- */
const VIEW = [
  { pos: [ 0.00, -0.02,  0.10], scale: 1.00 },
  { pos: [-1.50,  0.10, -0.10], scale: 0.62 },
  { pos: [ 1.55,  0.10, -0.30], scale: 0.58 },
  { pos: [ 0.00, -0.20,  0.20], scale: 0.85 },
];

/* tone → 天空 / 玻璃环境光 / 边缘色
   四片天：晨光蓝、黄昏粉、薄荷柠檬、薰衣草暮色。
   skyTop/skyBottom 喂给背景 shader；sun/tintA/tintB 是阳光与柔光带；
   envTop/envBottom 拉开刻面明度差，rim 是 Fresnel 边缘的薰衣草光。 */
const TONE = {
  paper:   { field: "#8FCDF5", skyTop: "#8FCDF5", skyBottom: "#F9EAD9",
             sun: "#FFF2C4", sunPos: [0.82, 0.16], tintA: "#FFD9E8", tintB: "#C4E8FF", tintAmt: 0.55, cloudAmt: 0.50,
             rim: "#C3CBF5", envTop: "#FFFDF4", envBottom: "#A9B6E6" },
  blue:    { field: "#F6C9E2", skyTop: "#F6C9E2", skyBottom: "#F3E6FA",
             sun: "#FFE3F0", sunPos: [0.62, 0.30], tintA: "#FFC9E4", tintB: "#E4D3FF", tintAmt: 0.70, cloudAmt: 0.35,
             rim: "#EFC9E4", envTop: "#FFF9FE", envBottom: "#C9A9E0" },
  amber:   { field: "#A9E3DC", skyTop: "#A9E3DC", skyBottom: "#FFF3C9",
             sun: "#FFF9C9", sunPos: [0.20, 0.24], tintA: "#C4F0E6", tintB: "#FFE9B8", tintAmt: 0.65, cloudAmt: 0.45,
             rim: "#B5E6DC", envTop: "#FDFFFB", envBottom: "#9ED6CC" },
  magenta: { field: "#B9A7EF", skyTop: "#B9A7EF", skyBottom: "#F9D9E8",
             sun: "#FFE9F4", sunPos: [0.78, 0.18], tintA: "#E3D8FF", tintB: "#FFD9EC", tintAmt: 0.70, cloudAmt: 0.40,
             rim: "#D8C8F7", envTop: "#FFFCFF", envBottom: "#B79FE6" },
};

const reduced = prefersReducedMotion();
const QA = qaMode();

/* ==========================================================================
   0. DOM 先出来。WebGL 是增强，不是前提。
   ========================================================================== */
renderAll();

const cursor = createCursor();
cursor.refresh();
wireRail();
wireCounters();

/* ==========================================================================
   1. 幕次几何：所有滚动派生量的唯一来源
   ========================================================================== */
const sections = C.acts.map((a) => document.getElementById("act-" + a.id)).filter(Boolean);
let bounds = [];

function measure() {
  const sy = window.scrollY;
  bounds = sections.map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + sy, bottom: r.bottom + sy, h: r.height };
  });
}
measure();
window.addEventListener("resize", measure, { passive: true });
window.addEventListener("load", measure);

/**
 * 返回 { i, j, w, frac }：
 *   i 当前幕，j 相邻幕，w 混合权重（边界处恰为 0.5，两侧连续）
 * band 越大过渡越长。所有随幕次变化的量都走这一个函数，保证彼此同步。
 */
function blend(band) {
  const c = window.scrollY + window.innerHeight * 0.5;
  let i = 0;
  for (let k = 0; k < bounds.length; k++) {
    if (c >= bounds[k].top) i = k;
  }
  const b = bounds[i];
  if (!b) return { i: 0, j: 0, w: 0 };
  const dDown = b.bottom - c;
  const dUp = c - b.top;
  if (i < bounds.length - 1 && dDown < band) {
    return { i, j: i + 1, w: 0.5 * smootherstep(1 - dDown / band) };
  }
  if (i > 0 && dUp < band) {
    return { i, j: i - 1, w: 0.5 * smootherstep(1 - dUp / band) };
  }
  return { i, j: i, w: 0 };
}

/* ==========================================================================
   2. WebGL 能力检测 → 兜底或启动
   ========================================================================== */
const canvas = document.getElementById("gl");

function hasWebGL2() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch { return false; }
}

function fallback(reason) {
  document.body.classList.add("no-webgl");
  document.body.classList.remove("is-booting");
  const poster = document.getElementById("poster");
  if (poster) poster.hidden = false;
  if (!document.querySelector(".fallback-note")) {
    const n = document.createElement("p");
    n.className = "fallback-note";
    n.textContent = "静态模式 · 内容完整";
    document.body.append(n);
  }
  // 钩子先挂上再跑首帧：兜底路径里任何一行出错，页面也不能停在「未就绪」。
  window.__site = { ready: true, webgl: false, reason, get act() { return blend(1).i; } };
  // 兜底下仍然要切 tone，否则色场永远停在第一幕
  const tick = () => {
    const { i } = blend(window.innerHeight * 0.16);
    setTone(C.acts[i].tone);
    setRail(i);
    if (cursor.enabled) cursor.update(1 / 60);
  };
  tick();
  window.addEventListener("scroll", tick, { passive: true });
}

/* ==========================================================================
   3. 启动
   ========================================================================== */
async function boot() {
  // ?tier=0|1|2 锁档：QA 在软件渲染下用得到，真实用户不会带这个参数
  const forced = Number(new URLSearchParams(location.search).get("tier"));
  const tier0 = Number.isInteger(forced) && forced >= 0 && forced <= 2 ? forced : initialTier();

  const chain = buildChain();
  const scene = createScene(canvas);
  scene.setHero(chain);

  const quality = createQuality({
    startTier: tier0,
    onChange: (spec) => applyTier(spec),
  });
  function applyTier(spec) {
    scene.setFboScale(spec.fbo);
    scene.state.useTransition = spec.transition && !reduced;
    shadowTarget = spec.shadow;
  }
  let shadowTarget = quality.spec.shadow;
  applyTier(quality.spec);
  if (Number.isInteger(forced) && forced >= 0 && forced <= 2) quality.freeze(forced);

  scene.resize();
  window.addEventListener("resize", () => { scene.resize(); measure(); }, { passive: true });

  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); fallback("context-lost"); });

  /* --- 主循环 --- */
  const skyTopC = new THREE.Color(), skyBotC = new THREE.Color();
  const tintAC = new THREE.Color(), tintBC = new THREE.Color();
  const sunC = new THREE.Color();
  const sunPos = new THREE.Vector2();
  const tmpC = new THREE.Color();
  const pos = new THREE.Vector3();
  let curPos = new THREE.Vector3(VIEW[0].pos[0], VIEW[0].pos[1], VIEW[0].pos[2]);
  let curScale = VIEW[0].scale;
  let lastScroll = window.scrollY;
  let scrollVel = 0;
  let warp = 0;
  let t = 0;
  let prev = performance.now();
  let raf = 0;
  let booted = false;

  function step(now) {
    raf = requestAnimationFrame(step);
    const dt = Math.min(Math.max((now - prev) / 1000, 1 / 240), 0.1);
    prev = now;
    quality.tick(dt);
    if (!reduced) t += dt;

    /* --- 滚动派生量 --- */
    const vh = window.innerHeight;
    const bView = blend(vh * 0.40);
    const bTone = blend(vh * 0.16);

    // 取景（reduced-motion 下不做相机漂移，直接落位）
    const A = VIEW[bView.i], B = VIEW[bView.j];
    pos.set(
      A.pos[0] + (B.pos[0] - A.pos[0]) * bView.w,
      A.pos[1] + (B.pos[1] - A.pos[1]) * bView.w,
      A.pos[2] + (B.pos[2] - A.pos[2]) * bView.w,
    );
    const scl = A.scale + (B.scale - A.scale) * bView.w;

    // 窄屏：主体退到构图外侧，不压文字
    const aspect = window.innerWidth / Math.max(vh, 1);
    if (aspect < 0.95) { pos.x *= 0.42; pos.y += 0.24; }
    const fit = clamp(aspect / 1.6, 0.55, 1);

    if (reduced) { curPos.copy(pos); curScale = scl * fit; }
    else {
      curPos.x = damp(curPos.x, pos.x, 0.10, dt);
      curPos.y = damp(curPos.y, pos.y, 0.10, dt);
      curPos.z = damp(curPos.z, pos.z, 0.10, dt);
      curScale = damp(curScale, scl * fit, 0.10, dt);
    }

    // 天空
    const TA = TONE[C.acts[bTone.i].tone], TB = TONE[C.acts[bTone.j].tone];
    const tw = bTone.w;
    skyTopC.set(TA.skyTop).lerp(tmpC.set(TB.skyTop), tw);
    skyBotC.set(TA.skyBottom).lerp(tmpC.set(TB.skyBottom), tw);
    sunC.set(TA.sun).lerp(tmpC.set(TB.sun), tw);
    tintAC.set(TA.tintA).lerp(tmpC.set(TB.tintA), tw);
    tintBC.set(TA.tintB).lerp(tmpC.set(TB.tintB), tw);
    sunPos.set(
      TA.sunPos[0] + (TB.sunPos[0] - TA.sunPos[0]) * tw,
      TA.sunPos[1] + (TB.sunPos[1] - TA.sunPos[1]) * tw,
    );

    /* --- 滚动速度 → 转场强度 --- */
    const sy = window.scrollY;
    const inst = (sy - lastScroll) / dt;
    lastScroll = sy;
    scrollVel = damp(scrollVel, inst, 0.05, dt);
    const wTarget = QA || reduced ? 0 : clamp(Math.abs(scrollVel) / 2400, 0, 1);
    warp = damp(warp, wTarget, wTarget > warp ? 0.05 : 0.14, dt);

    /* --- 写统一 uniform --- */
    const time = QA || reduced ? 8.0 : t;

    const bg = scene.bg.uniforms;
    bg.uSkyTopA.value.copy(skyTopC);
    bg.uSkyBottomA.value.copy(skyBotC);
    bg.uSkyTopB.value.copy(skyTopC);
    bg.uSkyBottomB.value.copy(skyBotC);
    bg.uMix.value = 0;
    bg.uSun.value.copy(sunC);
    bg.uSunPos.value.copy(sunPos);
    bg.uSunAmt.value = 1;
    bg.uTintA.value.copy(tintAC);
    bg.uTintB.value.copy(tintBC);
    bg.uTintAmt.value = TA.tintAmt + (TB.tintAmt - TA.tintAmt) * tw;
    bg.uCloudAmt.value = TA.cloudAmt + (TB.cloudAmt - TA.cloudAmt) * tw;
    bg.uTime.value = time;
    bg.uShadowAmt.value = damp(bg.uShadowAmt.value, shadowTarget, 0.2, dt);
    scene.transition.uniforms.uAmt.value = warp;
    scene.transition.uniforms.uDir.value = scrollVel >= 0 ? 1 : -1;
    scene.transition.uniforms.uSeed.value = QA ? 3 : Math.floor(sy / 240);

    chain.uniforms.uSkyBottom.value.copy(skyBotC);
    chain.uniforms.uTime.value = time;

    /* --- 主体位姿 --- */
    chain.update(dt, time, QA || reduced);
    chain.mesh.position.copy(curPos);
    chain.mesh.scale.setScalar(curScale);

    /* --- DOM 同步 --- */
    setTone(C.acts[bTone.w > 0.5 ? bTone.j : bTone.i].tone);
    setRail(bView.i);
    if (cursor.enabled) cursor.update(dt);

    scene.render();

    if (!booted) {
      booted = true;
      document.body.classList.remove("is-booting");
      cursor.refresh();
    }
  }

  // 字体就位后重新测量，避免首帧布局抖动
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    measure();
    cursor.refresh();
  });

  raf = requestAnimationFrame(step);

  /* --- QA 钩子 --- */
  window.__site = {
    ready: true,
    webgl: true,
    qa: QA,
    reduced,
    get act() { return bView().i; },
    get tone() { return document.body.dataset.tone; },
    get tier() { return quality.tier; },
    get tierName() { return quality.spec.name; },
    get chainSpin() { return chain.mesh.rotation.y; },
    get fboScale() { return scene.state.fboScale; },
    quality,
    feedFps(fps, seconds) {
      const dt = 1 / fps;
      const n = Math.ceil(seconds / dt);
      for (let k = 0; k < n; k++) quality.tick(dt);
      return quality.debug();
    },
    forceTier(n) { quality.freeze(n); return quality.debug(); },
    pick(cx, cy) {
      const c = scene.renderer.domElement;
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      scene.render();
      const px = Math.round(cx / 100 * c.width);
      const py = c.height - 1 - Math.round(cy / 100 * c.height);
      const buf = new Uint8Array(4);
      gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return Array.from(buf);
    },
  };
  function bView() { return blend(window.innerHeight * 0.40); }
}

/* ==========================================================================
   4. DOM 小件
   ========================================================================== */
let toneNow = "";
function setTone(tone) {
  if (tone === toneNow) return;
  toneNow = tone;
  document.body.dataset.tone = tone;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", TONE[tone]?.field ?? "#EFEBE4");
}

let railNow = -1;
function setRail(i) {
  if (i === railNow) return;
  railNow = i;
  const items = document.querySelectorAll(".rail__item");
  items.forEach((b, k) => b.classList.toggle("is-active", k === i));
}

function wireRail() {
  document.querySelectorAll(".rail__item").forEach((b) => {
    b.addEventListener("click", () => {
      const el = document.getElementById("act-" + b.dataset.goto);
      el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
  });
}

/** 数字滚动计数：只跑一次，尊重 reduced-motion（v1 已无计数器，保留实现备用） */
function wireCounters() {
  document.querySelectorAll(".count[data-counting]").forEach((el) => {
    const target = Number(el.dataset.target || 0);
    const suffix = el.dataset.suffix || "";
    if (reduced || QA) { el.textContent = target + suffix; return; }
    onceVisible(el, () => {
      const t0 = performance.now();
      const dur = 1500;
      const run = (now) => {
        const p = clamp((now - t0) / dur);
        el.textContent = Math.round(easeOutExpo(p) * target) + suffix;
        if (p < 1) requestAnimationFrame(run);
        else el.textContent = target + suffix;
      };
      requestAnimationFrame(run);
    }, { threshold: 0.5 });
  });
}

/* ==========================================================================
   5. 分发 —— 必须放在模块最后（let 绑定初始化后才能调用）
   ========================================================================== */
if (!hasWebGL2()) {
  fallback("no-webgl2");
} else {
  boot().catch((err) => { console.error(err); fallback("boot-failed"); });
}