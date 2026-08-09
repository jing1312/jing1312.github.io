/*
 * main.js — 只负责 Three.js 画面和页面状态之间的连接。
 * 页面本身由 render.js 控制；这里让天空、玻璃珠链和导航保持同一节奏。
 */

import * as THREE from "three";
import * as C from "./content.js";
import { renderAll } from "./ui/render.js";
import { buildChain } from "./gl/chain.js";
import { createScene } from "./gl/scene.js";
import { createQuality, initialTier } from "./gl/quality.js";
import { prefersReducedMotion, qaMode, damp, clamp } from "./util/anim.js";

const reduced = prefersReducedMotion();
const QA = qaMode();

const TONE = {
  paper: { skyTop: "#9bd6f5", skyBottom: "#f7e1ea", sun: "#fff2c4", tintA: "#ffd9e8", tintB: "#c4e8ff", sunPos: [0.82, 0.16], tintAmt: .5, cloudAmt: .48 },
  blue: { skyTop: "#e4c7ed", skyBottom: "#f9e3ea", sun: "#ffe3f0", tintA: "#ffc9e4", tintB: "#e4d3ff", sunPos: [0.62, 0.30], tintAmt: .62, cloudAmt: .36 },
  amber: { skyTop: "#a6ddd3", skyBottom: "#fff0c1", sun: "#fff7c9", tintA: "#c4f0e6", tintB: "#ffe9b8", sunPos: [0.20, 0.24], tintAmt: .58, cloudAmt: .42 },
  mint: { skyTop: "#b5e5d8", skyBottom: "#e6f2c5", sun: "#fff4bf", tintA: "#d8f4e1", tintB: "#d4e8ff", sunPos: [0.28, 0.20], tintAmt: .52, cloudAmt: .4 },
  lavender: { skyTop: "#baa9eb", skyBottom: "#f5d9e7", sun: "#ffe9f4", tintA: "#e3d8ff", tintB: "#ffd9ec", sunPos: [0.78, 0.18], tintAmt: .62, cloudAmt: .4 },
  magenta: { skyTop: "#bcaceb", skyBottom: "#f9d6dc", sun: "#ffe9f4", tintA: "#e3d8ff", tintB: "#ffd9ec", sunPos: [0.78, 0.18], tintAmt: .64, cloudAmt: .38 },
};

const VIEW = {
  home: { pos: [1.22, .16, -.15], scale: .76 },
  garden: { pos: [-1.55, .18, -.22], scale: .62 },
  projects: { pos: [1.52, -.04, -.18], scale: .54 },
  workbench: { pos: [-1.42, -.22, -.12], scale: .54 },
  notes: { pos: [1.45, .08, -.12], scale: .58 },
  about: { pos: [.35, -.12, .05], scale: .7 },
};

renderAll();

const canvas = document.getElementById("gl");

function hasWebGL2() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

function fallback(reason) {
  document.body.classList.add("no-webgl");
  document.body.classList.remove("is-booting");
  const note = document.createElement("p");
  note.className = "fallback-note";
  note.textContent = "静态模式 · 内容完整";
  document.body.append(note);
  window.__site = { ready: true, webgl: false, reason, get view() { return window.__homepage?.view || "home"; } };
}

async function boot() {
  const forced = Number(new URLSearchParams(location.search).get("tier"));
  const tier = Number.isInteger(forced) && forced >= 0 && forced <= 2 ? forced : initialTier();
  const chain = buildChain();
  const scene = createScene(canvas);
  scene.setHero(chain);

  const quality = createQuality({
    startTier: tier,
    onChange: (spec) => {
      scene.setFboScale(spec.fbo);
      scene.state.useTransition = spec.transition && !reduced;
    },
  });
  scene.setFboScale(quality.spec.fbo);
  scene.state.useTransition = quality.spec.transition && !reduced;
  if (Number.isInteger(forced) && forced >= 0 && forced <= 2) quality.freeze(forced);
  scene.resize();
  window.addEventListener("resize", () => scene.resize(), { passive: true });
  canvas.addEventListener("webglcontextlost", (event) => { event.preventDefault(); cancelAnimationFrame(raf); fallback("context-lost"); });

  const current = new THREE.Color("#9bd6f5");
  const currentBottom = new THREE.Color("#f7e1ea");
  const currentSun = new THREE.Color("#fff2c4");
  const currentTintA = new THREE.Color("#ffd9e8");
  const currentTintB = new THREE.Color("#c4e8ff");
  const targetTop = new THREE.Color();
  const targetBottom = new THREE.Color();
  const targetSun = new THREE.Color();
  const targetTintA = new THREE.Color();
  const targetTintB = new THREE.Color();
  const targetPos = new THREE.Vector3();
  const currentPos = new THREE.Vector3(...VIEW.home.pos);
  let currentScale = VIEW.home.scale;
  let previous = performance.now();
  let time = 0;
  let raf = 0;
  let booted = false;

  function step(now) {
    raf = requestAnimationFrame(step);
    const dt = Math.min(Math.max((now - previous) / 1000, 1 / 240), .1);
    previous = now;
    quality.tick(dt);
    if (!reduced) time += dt;

    const view = window.__homepage?.view || "home";
    const target = VIEW[view] || VIEW.home;
    const narrow = window.innerWidth < 760;
    targetPos.set(target.pos[0] * (narrow ? .42 : 1), target.pos[1] + (narrow ? .28 : 0), target.pos[2]);
    const targetScale = target.scale * (narrow ? .74 : 1);
    if (reduced) { currentPos.copy(targetPos); currentScale = targetScale; }
    else {
      currentPos.x = damp(currentPos.x, targetPos.x, .12, dt);
      currentPos.y = damp(currentPos.y, targetPos.y, .12, dt);
      currentPos.z = damp(currentPos.z, targetPos.z, .12, dt);
      currentScale = damp(currentScale, targetScale, .12, dt);
    }

    const toneName = C.tones[view] || "paper";
    const tone = TONE[toneName] || TONE.paper;
    current.lerp(targetTop.set(tone.skyTop), reduced ? 1 : .035);
    currentBottom.lerp(targetBottom.set(tone.skyBottom), reduced ? 1 : .035);
    currentSun.lerp(targetSun.set(tone.sun), reduced ? 1 : .035);
    currentTintA.lerp(targetTintA.set(tone.tintA), reduced ? 1 : .035);
    currentTintB.lerp(targetTintB.set(tone.tintB), reduced ? 1 : .035);
    const bg = scene.bg.uniforms;
    bg.uSkyTopA.value.copy(current); bg.uSkyTopB.value.copy(current);
    bg.uSkyBottomA.value.copy(currentBottom); bg.uSkyBottomB.value.copy(currentBottom);
    bg.uSun.value.copy(currentSun); bg.uSunPos.value.set(tone.sunPos[0], tone.sunPos[1]);
    bg.uTintA.value.copy(currentTintA); bg.uTintB.value.copy(currentTintB);
    bg.uTintAmt.value = tone.tintAmt; bg.uCloudAmt.value = tone.cloudAmt; bg.uTime.value = QA || reduced ? 8 : time;
    scene.transition.uniforms.uAmt.value = 0;
    chain.uniforms.uSkyBottom.value.copy(currentBottom);
    chain.update(dt, QA || reduced ? 8 : time, QA || reduced);
    chain.mesh.position.copy(currentPos);
    chain.mesh.scale.setScalar(currentScale);
    scene.render();

    if (!booted) {
      booted = true;
      document.body.classList.remove("is-booting");
    }
  }

  window.__site = {
    ready: true,
    webgl: true,
    qa: QA,
    reduced,
    get view() { return window.__homepage?.view || "home"; },
    get tier() { return quality.tier; },
    get tierName() { return quality.spec.name; },
    quality,
    forceTier(value) { quality.freeze(clamp(value, 0, 2)); return quality.debug(); },
  };
  raf = requestAnimationFrame(step);
}

if (!canvas || !hasWebGL2()) fallback("no-webgl2");
else boot().catch((error) => { console.error(error); fallback("boot-failed"); });
