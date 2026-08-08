/* ==========================================================================
   main.js — 引导 + 幕次状态机
   职责边界：
     content.js 管文案；render.js 管 DOM；gl/* 管画面；这里只管「什么时候变成什么」。

   滚动是原生的（没有惯性劫持——用户明确没勾这项）。所有 3D 状态都是滚动位置的
   纯函数：同一个滚动位置永远得到同一帧，这也是 QA 能对 uMorph 做断言的前提。
   ========================================================================== */

import * as THREE from "three";
import * as C from "./content.js";
import { renderAll } from "./ui/render.js";
import { buildStructure } from "./gl/morph.js";
import { buildGlass } from "./gl/glass.js";
import { createScene } from "./gl/scene.js";
import { createQuality, initialTier } from "./gl/quality.js";
import { createCursor } from "./ui/cursor.js";
import { createDrag } from "./ui/drag.js";
import { clamp, damp, smootherstep, easeOutExpo, onceVisible, prefersReducedMotion, qaMode } from "./util/anim.js";

/* --------------------------------------------------------------------------
   每一幕的取景与天空
   第 1 幕主体正居中央（Hero 的主角）；之后在左右两侧来回换位，
   给磨砂面板让出舞台，同时保持「玻璃一直在视野里」的连续性。
   -------------------------------------------------------------------------- */
const VIEW = [
  { pos: [ 0.00, -0.02,  0.10], scale: 0.95 },
  { pos: [ 1.40,  0.30, -0.30], scale: 0.62 },
  { pos: [-1.45,  0.12, -0.25], scale: 0.62 },
  { pos: [ 1.50, -0.28, -0.40], scale: 0.58 },
  { pos: [-1.05, -0.05,  0.05], scale: 0.85 },
  { pos: [ 1.50,  0.35, -0.55], scale: 0.55 },
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
/* 玻璃内结构体的固定配色：草莓粉 → 晴空蓝 */
const INK_IN = new THREE.Color("#F96FA0");
const INK_OUT = new THREE.Color("#4E9FF1");
/* 玻璃刻面棱线：极淡雾蓝 */
const EDGE_IN = new THREE.Color("#52698C");

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
  if (poster) { poster.hidden = false; poster.removeAttribute("aria-hidden"); poster.setAttribute("aria-hidden", "true"); }
  if (!document.querySelector(".fallback-note")) {
    const n = document.createElement("p");
    n.className = "fallback-note";
    n.textContent = "静态模式 · 内容完整";
    document.body.append(n);
  }
  // 钩子先挂上再跑首帧：兜底路径里任何一行出错，页面也不能停在「未就绪」。
  // 无 WebGL 的用户拿到的是纯 DOM 页面，它必须无条件可读。
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

// 分发写在文件末尾（见「5. 分发」）：fallback 会用到模块尾部用 let 声明的
// toneNow / railNow，在这里同步调用会撞上 TDZ。

/* ==========================================================================
   3. 启动
   ========================================================================== */
async function boot() {
  const molecule = await fetch("data/molecule.json", { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error("molecule.json " + r.status);
    return r.json();
  });

  const structure = buildStructure(molecule);
  // ?tier=0|1|2 锁档：QA 在软件渲染下用得到，真实用户不会带这个参数
  const forced = Number(new URLSearchParams(location.search).get("tier"));
  const tier0 = Number.isInteger(forced) && forced >= 0 && forced <= 2 ? forced : initialTier();

  const glass = buildGlass({ detail: 5, samples: 9 });
  glass.setNodes(structure.graphNodes, structure.molNodes);

  const scene = createScene(canvas);
  scene.setStructure(structure.mesh);
  scene.setGlass(glass);

  const quality = createQuality({
    startTier: tier0,
    onChange: (spec) => applyTier(spec),
  });
  function applyTier(spec) {
    glass.setSamples(spec.samples);
    glass.setDetail(spec.detail);
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

  /* --- 拖拽：只在第 5 幕、且指针真的落在主体上时接管 --- */
  const camRight = new THREE.Vector3();
  const centerW = new THREE.Vector3();
  const proj = new THREE.Vector3();
  function screenCircle() {
    centerW.setFromMatrixPosition(glass.mesh.matrixWorld);
    proj.copy(centerW).project(scene.camera);
    const x = (proj.x * 0.5 + 0.5) * window.innerWidth;
    const y = (1 - (proj.y * 0.5 + 0.5)) * window.innerHeight;
    camRight.setFromMatrixColumn(scene.camera.matrixWorld, 0);
    const edge = centerW.clone().addScaledVector(camRight, glass.mesh.scale.x * 1.35).project(scene.camera);
    const r = Math.abs(edge.x - proj.x) * 0.5 * window.innerWidth;
    return { x, y, r: Math.max(r, 40) };
  }

  let actIndex = 0;
  const drag = createDrag({
    getEnabled: () => !reduced && actIndex === 4,
    getCircle: screenCircle,
    onState: ({ dragging, hovering }) => {
      cursor.setDrag(dragging || hovering);
      cursor.setLabel(dragging ? "松手" : hovering ? C.molecule.dragHint : null);
    },
  });

  /* --- 主循环 --- */
  const skyTopC = new THREE.Color(), skyBotC = new THREE.Color();
  const tintAC = new THREE.Color(), tintBC = new THREE.Color();
  const sunC = new THREE.Color();
  const rimC = new THREE.Color(), envC = new THREE.Color(), envT = new THREE.Color();
  const tmpC = new THREE.Color();
  const sunPos = new THREE.Vector2();
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
    actIndex = bView.i;

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

    // 形变：0 流体 → 1 有向图 → 2 分子
    const morph = C.acts[bView.i].morph + (C.acts[bView.j].morph - C.acts[bView.i].morph) * bView.w;

    // 天空 / 玻璃环境光 / 边缘色
    const TA = TONE[C.acts[bTone.i].tone], TB = TONE[C.acts[bTone.j].tone];
    const tw = bTone.w;
    skyTopC.set(TA.skyTop).lerp(tmpC.set(TB.skyTop), tw);
    skyBotC.set(TA.skyBottom).lerp(tmpC.set(TB.skyBottom), tw);
    sunC.set(TA.sun).lerp(tmpC.set(TB.sun), tw);
    tintAC.set(TA.tintA).lerp(tmpC.set(TB.tintA), tw);
    tintBC.set(TA.tintB).lerp(tmpC.set(TB.tintB), tw);
    rimC.set(TA.rim).lerp(tmpC.set(TB.rim), tw);
    envC.set(TA.envBottom).lerp(tmpC.set(TB.envBottom), tw);
    envT.set(TA.envTop).lerp(tmpC.set(TB.envTop), tw);
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

    /* --- 写 uniform --- */
    const time = QA || reduced ? 8.0 : t;

    structure.uniforms.uMorph.value = morph;
    structure.uniforms.uTime.value = time;
    structure.uniforms.uInkA.value.copy(INK_IN);
    structure.uniforms.uInkB.value.copy(INK_OUT);
    structure.uniforms.uTurb.value = reduced ? 0 : 1;
    // 流体态是 2400 条流线，线密度天然比骨架高得多；恒定不透明度会让
    // Hero 糊成一团。按 morph 提升：流体 0.55 → 骨架/分子 0.95。
    structure.uniforms.uOpacity.value = 0.75 + 0.20 * clamp(morph, 0, 1);

    glass.shared.uMorph.value = morph;
    glass.shared.uTime.value = time;
    glass.shared.uTurb.value = reduced ? 0 : 1;
    glass.uniforms.uRim.value.copy(rimC);
    glass.uniforms.uEnvBottom.value.copy(envC);
    glass.uniforms.uEnvTop.value.copy(envT);
    glass.uniforms.uEdge.value.copy(EDGE_IN);   // 刻面棱线：极淡雾蓝，与天空同族
    glass.uniforms.uPointer.value.set(cursor.uv.x, cursor.uv.y);
    glass.uniforms.uLens.value = cursor.enabled ? 0.16 : 0;

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

    /* --- 主体位姿：玻璃与结构体共用同一套 TRS --- */
    drag.update(dt);
    for (const m of [glass.mesh, structure.mesh]) {
      m.position.copy(curPos);
      m.scale.setScalar(curScale);
      m.quaternion.copy(drag.quaternion);
    }

    /* --- DOM 同步 --- */
    setTone(C.acts[bTone.w > 0.5 ? bTone.j : bTone.i].tone);
    setRail(actIndex);
    if (cursor.enabled) {
      if (!drag.dragging && !drag.hovering) cursor.setLabel(null);
      cursor.update(dt);
    }

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
    get morph() { return structure.uniforms.uMorph.value; },
    get act() { return actIndex; },
    get tone() { return document.body.dataset.tone; },
    get tier() { return quality.tier; },
    get tierName() { return quality.spec.name; },
    get samples() { return glass.material.defines.SAMPLES; },
    get fboScale() { return scene.state.fboScale; },
    quality,
    /** 注入伪造帧时长，验证降档逻辑（T4）。 */
    feedFps(fps, seconds) {
      const dt = 1 / fps;
      const n = Math.ceil(seconds / dt);
      for (let k = 0; k < n; k++) quality.tick(dt);
      return quality.debug();
    },
    forceTier(n) { quality.freeze(n); return quality.debug(); },
  };
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

/** 数字滚动计数：只跑一次，尊重 reduced-motion。 */
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
   5. 分发 —— 必须放在模块最后
   函数声明会提升，但 setTone/setRail 依赖的 toneNow / railNow 是 let，
   在模块求值中途调用 fallback() 会抛 TDZ ReferenceError，页面就再也 ready 不了。
   放到末尾，所有模块级绑定都已初始化。
   ========================================================================== */
if (!hasWebGL2()) {
  fallback("no-webgl2");
} else {
  boot().catch((err) => { console.error(err); fallback("boot-failed"); });
}
