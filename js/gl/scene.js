/* ==========================================================================
   scene.js — 渲染编排 · 夏日天空 + 玻璃链
   三个 pass：
     1a 背景 ortho quad   天空渐变 + 太阳 + 柔云 + 光带 → fboA
     1b 转场              柔光拖影（轻色差）  fboA → fboB
     2  主体（玻璃链）    直接画到屏幕，珠面折射取样 fboA/fboB

   链珠的材质需要「可折射的内容」——天空渐变、太阳、柔云、彩色光带，
   每一颗珠在云边、太阳、色带上勾出柔和的彩色细边，这就是梦幻夏日
   里唯一的 3D 主角：不套模型，不贴图。
   ========================================================================== */

import * as THREE from "three";
import { createTransition } from "./transition.js";

/* 颜色不做任何色彩管理转换：CSS 里是什么值，屏幕上就是什么值 */
THREE.ColorManagement.enabled = false;

const FULLSCREEN_VS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/* --------------------------------------------------------------------------
   背景材质：夏日天空（与旧版完全一致，配色仍随 TONE 表切换）
   -------------------------------------------------------------------------- */
function makeBackground() {
  const uniforms = {
    uRes:        { value: new THREE.Vector2(1, 1) },
    uSkyTopA:    { value: new THREE.Color("#8FCDF5") },
    uSkyBottomA: { value: new THREE.Color("#F9EAD9") },
    uSkyTopB:    { value: new THREE.Color("#8FCDF5") },
    uSkyBottomB: { value: new THREE.Color("#F9EAD9") },
    uMix:        { value: 0 },
    uSun:        { value: new THREE.Color("#FFF2C4") },
    uSunPos:     { value: new THREE.Vector2(0.78, 0.20) },
    uSunAmt:     { value: 1 },
    uTintA:      { value: new THREE.Color("#FFD9E8") },
    uTintB:      { value: new THREE.Color("#C4E8FF") },
    uTintAmt:    { value: 0.5 },
    uCloud:      { value: new THREE.Color("#FFFFFF") },
    uCloudAmt:   { value: 0.55 },
    uTime:       { value: 0 },
    uShadow:     { value: new THREE.Vector3(0.7, 0.36, 0.34) }, // uv x, uv y, 半径
    uShadowAmt:  { value: 0.45 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: FULLSCREEN_VS,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform vec2  uRes;
      uniform vec2  uSunPos;
      uniform vec3  uSkyTopA, uSkyBottomA, uSkyTopB, uSkyBottomB;
      uniform vec3  uSun, uTintA, uTintB, uCloud;
      uniform float uMix, uSunAmt, uTintAmt, uCloudAmt, uTime;
      uniform vec3  uShadow;
      uniform float uShadowAmt;

      float hash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      float vnoise2(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      void main() {
        vec2 fc = vUv * uRes;
        float aspect = uRes.x / max(uRes.y, 1.0);

        // --- 天空：头顶天蓝，地平线奶桃（uv.y=1 是顶、=0 是底） ---
        vec3 top = mix(uSkyTopA, uSkyTopB, uMix);
        vec3 bot = mix(uSkyBottomA, uSkyBottomB, uMix);
        float h = smoothstep(0.0, 1.0, vUv.y);
        vec3 col = mix(bot, top, h * h * (3.0 - 2.0 * h));

        // --- 太阳：暖光晕 + 小圆盘（qa 模式下 uTime 冻结，位置固定） ---
        vec2 sd = (vUv - uSunPos) * vec2(aspect, 1.0);
        float d = length(sd);
        float glow = exp(-d * d * 30.0);
        float disk = smoothstep(0.038, 0.026, d);
        col = mix(col, uSun, clamp(disk * 0.95 + glow * 0.30 * uSunAmt, 0.0, 0.95));

        // --- 两道柔光色带：给玻璃提供被折射的内容 ---
        vec2 bx = vec2(
          (vUv.x * aspect - 0.30) * 3.4,
          (vUv.x * aspect - 0.62) * 2.9
        );
        float b1 = exp(-bx.x * bx.x / 1.0);
        float b2 = exp(-bx.y * bx.y / 1.0);
        col = mix(col, uTintA, b1 * uTintAmt * 0.6);
        col = mix(col, uTintB, b2 * uTintAmt * 0.4);

        // --- 柔云：双层值噪声，缓慢漂移 ---
        vec2 cq = vUv * vec2(aspect, 1.0) * 2.2;
        float n1 = vnoise2(cq * 2.6 + vec2(uTime * 0.010, -uTime * 0.006)) * 0.55;
        float n2 = vnoise2(cq * 5.2 - vec2(uTime * 0.016, uTime * 0.008)) * 0.45;
        float cloud = smoothstep(0.30, 0.72, n1 + n2);
        col = mix(col, uCloud, clamp(cloud * uCloudAmt, 0.0, 0.75));

        // --- 接触阴影：给主体压出一点重量 ---
        vec2 sp = (vUv - uShadow.xy) * vec2(aspect, 1.9);
        float sd2 = length(sp) / max(uShadow.z, 1e-3);
        float shade = exp(-sd2 * sd2 * 1.6) * uShadowAmt;
        col = mix(col, col * 0.78, clamp(shade, 0.0, 1.0));

        // --- 轻微暗角，把视线送回画面中心 ---
        float vg = length((vUv - 0.5) * vec2(aspect, 1.0));
        col *= 1.0 - smoothstep(0.55, 1.08, vg) * 0.14;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return { material, uniforms };
}

/* --------------------------------------------------------------------------
   主入口
   -------------------------------------------------------------------------- */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 1);

  const quad = new THREE.PlaneGeometry(2, 2);
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---- 背景 ---- */
  const bg = makeBackground();
  const bgScene = new THREE.Scene();
  const bgQuad = new THREE.Mesh(quad, bg.material);
  bgQuad.frustumCulled = false;
  bgScene.add(bgQuad);

  /* ---- 主体（珠链，透视相机） ---- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 4.6);

  /* ---- 转场 ---- */
  const transition = createTransition();
  const trScene = new THREE.Scene();
  const trQuad = new THREE.Mesh(quad, transition.material);
  trQuad.frustumCulled = false;
  trScene.add(trQuad);

  /* ---- blit ---- */
  const blitMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null } },
    depthTest: false, depthWrite: false,
    vertexShader: FULLSCREEN_VS,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv; uniform sampler2D uTex;
      void main() { gl_FragColor = vec4(texture2D(uTex, vUv).rgb, 1.0); }
    `,
  });
  const blitScene = new THREE.Scene();
  const blitQuad = new THREE.Mesh(quad, blitMat);
  blitQuad.frustumCulled = false;
  blitScene.add(blitQuad);

  /* ---- 渲染目标 ---- */
  const rtOpts = {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  };
  const fboA = new THREE.WebGLRenderTarget(2, 2, rtOpts);
  const fboB = new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: false });

  const state = {
    fboScale: 1,
    dpr: 1,
    width: 2,
    height: 2,
    useTransition: true,
    hero: null,
  };

  function setHero(hero) { state.hero = hero; scene.add(hero.mesh); }

  function resize() {
    const w = Math.max(canvas.clientWidth || window.innerWidth, 1);
    const h = Math.max(canvas.clientHeight || window.innerHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.dpr = dpr; state.width = w; state.height = h;

    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);

    const pw = Math.max(Math.round(w * dpr * state.fboScale), 2);
    const ph = Math.max(Math.round(h * dpr * state.fboScale), 2);
    fboA.setSize(pw, ph);
    fboB.setSize(pw, ph);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    bg.uniforms.uRes.value.set(pw, ph);
    transition.uniforms.uRes.value.set(pw, ph);
    // 珠链的折射需要屏幕分辨率的精确比值
    if (state.hero) state.hero.uniforms.uResolution.value.set(w * dpr, h * dpr);
  }

  function setFboScale(s) {
    if (Math.abs(state.fboScale - s) < 1e-3) return;
    state.fboScale = s;
    resize();
  }

  /** 主体在屏幕上的位置 → 接触阴影落点。 */
  function updateShadow() {
    const hero = state.hero;
    if (!hero) return;
    const p = new THREE.Vector3().setFromMatrixPosition(hero.mesh.matrixWorld);
    p.project(camera);
    const uvx = p.x * 0.5 + 0.5;
    const uvy = p.y * 0.5 + 0.5;
    const s = hero.mesh.scale.x * 1.25;
    bg.uniforms.uShadow.value.set(uvx, uvy - 0.30 * s, 0.30 * s + 0.10);
  }

  function render() {
    camera.updateMatrixWorld();
    updateShadow();

    // Pass 1 —— 背景 → fboA
    renderer.setRenderTarget(fboA);
    renderer.clear(true, true, false);
    renderer.render(bgScene, fsCam);

    // Pass 1b —— 转场后处理 → fboB
    let src = fboA;
    if (state.useTransition && transition.uniforms.uAmt.value > 0.0015) {
      transition.uniforms.uTex.value = fboA.texture;
      renderer.setRenderTarget(fboB);
      renderer.clear(true, false, false);
      renderer.render(trScene, fsCam);
      src = fboB;
    }

    // Pass 2 —— 背景铺到屏幕
    renderer.setRenderTarget(null);
    renderer.clear(true, true, false);
    blitMat.uniforms.uTex.value = src.texture;
    renderer.render(blitScene, fsCam);

    // Pass 3 —— 玻璃链：珠子折射出 fbo 内容
    const hero = state.hero;
    if (hero) {
      hero.uniforms.uTex.value = src.texture;
      renderer.render(scene, camera);
    }
  }

  function dispose() {
    fboA.dispose(); fboB.dispose();
    renderer.dispose();
  }

  return {
    renderer, camera, scene,
    bg, transition, state,
    setHero,
    resize, setFboScale, render, dispose,
  };
}