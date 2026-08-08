/* ==========================================================================
   scene.js — 渲染编排
   六个 pass：
     1a 背景 ortho quad   色场 + 1px 硬线栅格 + 巨型 Bodoni 水印 + 接触阴影 → fboA
     1b 三态结构体        透视相机，透明底                             → fboCore
     2  transition        warp + 色度分离                              fboA → fboB
     3  blit              fboB → 屏幕
     4  玻璃背面深度      归一化视距写进 R 通道                        → fboDepth
     5  玻璃正面          强折射取样 fboB + 弱折射取样 fboCore          → 屏幕

   结构体不直接上屏：它整个在玻璃壳内部，只应该透过玻璃被看见。

   硬线栅格只画在 WebGL 层。这样玻璃能把它折弯——那才是玻璃存在的理由。
   无 WebGL 时才由 css/ui.css 用 CSS 渐变补一层网格。两边都画会毁掉幻觉。
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
   巨型拉丁水印：canvas2d → 纹理（Bodoni 已在页面里自托管）
   -------------------------------------------------------------------------- */
function makeWordTexture(word) {
  const W = 2048, H = 512;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#ffffff";
  g.textAlign = "left";
  g.textBaseline = "alphabetic";

  // 先按一个基准字号量宽，再缩放到刚好铺满画布宽度
  const base = 360;
  g.font = `900 ${base}px "Bodoni Display", "Bodoni Moda", Didot, "Times New Roman", serif`;
  const w0 = Math.max(g.measureText(word).width, 1);
  const size = Math.min(base * ((W - 8) / w0), H * 1.02);
  g.font = `900 ${size}px "Bodoni Display", "Bodoni Moda", Didot, "Times New Roman", serif`;
  const w1 = g.measureText(word).width;
  g.fillText(word, (W - w1) / 2, H * 0.86);

  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  return tex;
}

/* --------------------------------------------------------------------------
   背景材质
   -------------------------------------------------------------------------- */
function makeBackground() {
  const uniforms = {
    uRes:       { value: new THREE.Vector2(1, 1) },
    uFieldA:    { value: new THREE.Color("#EFEBE4") },
    uFieldB:    { value: new THREE.Color("#EFEBE4") },
    uFieldMix:  { value: 0 },
    uInk:       { value: new THREE.Color("#12100E") },
    uAccent:    { value: new THREE.Color("#FFC400") },
    uAccentAmt: { value: 0 },
    uAccentX:   { value: 0.68 },     // 硬边色块的左界（uv）
    uGridPitch: { value: 120 },      // 相邻竖线像素间距
    uGridOrigin:{ value: 40 },       // 版心左界（= .act 的 padding-left）
    uGridEnd:   { value: 1000 },     // 版心右界（让出章节轨走廊）
    uGridAlpha: { value: 0.13 },
    uHorizon:   { value: 0.5 },      // 水平基准线（uv y），<0 关闭
    uWmA:       { value: null },
    uWmB:       { value: null },
    uWmMix:     { value: 0 },
    uWmRect:    { value: new THREE.Vector4(-0.03, 0.03, 1.06, 0.40) },
    uWmAlpha:   { value: 0.085 },
    uShadow:    { value: new THREE.Vector3(0.7, 0.35, 0.34) }, // uv x, uv y, 半径
    uShadowAmt: { value: 0.5 },
    uGrain:     { value: 0.014 },
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
      uniform vec3  uFieldA, uFieldB, uInk, uAccent;
      uniform float uFieldMix, uAccentAmt, uAccentX;
      uniform float uGridPitch, uGridOrigin, uGridEnd, uGridAlpha, uHorizon;
      uniform sampler2D uWmA, uWmB;
      uniform float uWmMix, uWmAlpha;
      uniform vec4  uWmRect;
      uniform vec3  uShadow;
      uniform float uShadowAmt, uGrain;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      void main() {
        vec2 fc = vUv * uRes;
        vec3 field = mix(uFieldA, uFieldB, uFieldMix);

        // --- 硬边强调色块（Act 4 的琥珀立柱）：不是渐变，是切割 ---
        float blockEdge = step(uAccentX, vUv.x);
        field = mix(field, uAccent, blockEdge * uAccentAmt);

        vec3 col = field;

        // --- 接触阴影：给漂浮的主体压出重量 ---
        vec2 sp = (vUv - uShadow.xy) * vec2(1.0, 2.35);
        sp.x *= uRes.x / max(uRes.y, 1.0);
        float sd = length(sp) / max(uShadow.z, 1e-3);
        float shade = exp(-sd * sd * 1.7) * uShadowAmt;
        col = mix(col, col * 0.72, clamp(shade, 0.0, 1.0));

        // --- 巨型拉丁水印 ---
        vec2 wuv = (vUv - uWmRect.xy) / uWmRect.zw;
        if (wuv.x > 0.0 && wuv.x < 1.0 && wuv.y > 0.0 && wuv.y < 1.0) {
          float a = mix(texture2D(uWmA, wuv).a, texture2D(uWmB, wuv).a, uWmMix);
          col = mix(col, uInk, a * uWmAlpha);
        }

        // --- 1px 硬线栅格：周期竖线 + 两侧边界线 ---
        float t = (fc.x - uGridOrigin) / max(uGridPitch, 1.0);
        float ft = fract(t);
        float dPeriodic = min(ft, 1.0 - ft) * uGridPitch;
        float dEdge = min(abs(fc.x - uGridOrigin), abs(fc.x - uGridEnd));
        float d = min(dPeriodic, dEdge);
        float inside = step(uGridOrigin - 1.5, fc.x) * step(fc.x, uGridEnd + 1.5);
        float line = (1.0 - smoothstep(0.0, 1.0, d - 0.5)) * inside;
        col = mix(col, uInk, line * uGridAlpha);

        // --- 水平基准线 ---
        if (uHorizon > 0.0) {
          float dh = abs(fc.y - (1.0 - uHorizon) * uRes.y);
          float lh = 1.0 - smoothstep(0.0, 1.0, dh - 0.5);
          col = mix(col, uInk, lh * uGridAlpha * 1.25);
        }

        // --- 纸感颗粒：把「柔和数码平面」打掉 ---
        col += (hash12(fc) - 0.5) * uGrain;

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

  /* ---- 结构体（透视） ---- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 4.6);

  /* ---- 玻璃 ---- */
  const glassScene = new THREE.Scene();

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
  const fboDepth = new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true });
  // 结构体单独一张带 alpha 的图：它在玻璃**内部**，只经过前表面一次折射，
  // 位移量比「远在玻璃背后的背景」小一个量级。合到同一张背景图里会被当成
  // 远景一起强折射，结果是被缩成一小团甩到边上——那不是物理，是 bug。
  const fboCore = new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true });

  const state = {
    fboScale: 1,
    dpr: 1,
    width: 2,
    height: 2,
    useTransition: true,
    structure: null,
    glass: null,
    wmWord: "",
  };

  /* ---- 水印缓存 ---- */
  const wmCache = new Map();
  const blank = (() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 2;
    const t = new THREE.CanvasTexture(cv);
    t.generateMipmaps = false;
    return t;
  })();
  bg.uniforms.uWmA.value = blank;
  bg.uniforms.uWmB.value = blank;

  function wordTexture(word) {
    if (!word) return blank;
    if (!wmCache.has(word)) wmCache.set(word, makeWordTexture(word));
    return wmCache.get(word);
  }

  /** 换水印词：把旧词推到 A，新词放 B，由 uWmMix 交叉淡入。 */
  function setWatermark(word) {
    if (word === state.wmWord) return;
    bg.uniforms.uWmA.value = bg.uniforms.uWmB.value;
    bg.uniforms.uWmB.value = wordTexture(word);
    bg.uniforms.uWmMix.value = 0;
    state.wmWord = word;
  }

  /** 字体真正就位后重烤一次，避免首帧用了回退字形。 */
  function resetWatermarks() {
    for (const t of wmCache.values()) t.dispose();
    wmCache.clear();
    const w = state.wmWord;
    state.wmWord = "";
    bg.uniforms.uWmA.value = blank;
    bg.uniforms.uWmB.value = blank;
    setWatermark(w);
    bg.uniforms.uWmMix.value = 1;
  }

  function setStructure(mesh) { state.structure = mesh; scene.add(mesh); }
  function setGlass(glass) { state.glass = glass; glassScene.add(glass.mesh); }

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
    fboDepth.setSize(pw, ph);
    fboCore.setSize(pw, ph);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    bg.uniforms.uRes.value.set(pw, ph);
    transition.uniforms.uRes.value.set(pw, ph);
    // 玻璃正面画在**默认帧缓冲**上，所以归一化除数必须是屏幕绘制缓冲尺寸，
    // 不是 FBO 尺寸。写成 (pw, ph) 时 fboScale<1 会让 uv 整体放大 1/fboScale，
    // 半屏以外全部 clamp 到贴图边缘——就是之前那层奶白拉丝的真正来源。
    if (state.glass) state.glass.uniforms.uResolution.value.set(w * dpr, h * dpr);

    // 栅格：直接量一个真实 .act 的内边距，而不是重算 clamp()。
    // 版心右界要减去章节轨走廊，否则 GL 的边界线会和 DOM 的行尾错开。
    const actEl = document.querySelector(".act");
    let padL = Math.max(w * 0.032, 17), padR = padL;
    if (actEl) {
      const s = getComputedStyle(actEl);
      padL = parseFloat(s.paddingLeft) || padL;
      padR = parseFloat(s.paddingRight) || padR;
    }
    const cols = 12;
    const gutter = padL;                       // 列间距与左内边距同源
    const contentW = Math.max(w - padL - padR, 1);
    const colW = (contentW - (cols - 1) * gutter) / cols;
    const stride = w >= 1000 ? 1 : w >= 640 ? 2 : 4;
    const k = dpr * state.fboScale;
    bg.uniforms.uGridOrigin.value = padL * k;
    bg.uniforms.uGridEnd.value = (w - padR) * k;
    bg.uniforms.uGridPitch.value = (colW + gutter) * stride * k;
  }

  function setFboScale(s) {
    if (Math.abs(state.fboScale - s) < 1e-3) return;
    state.fboScale = s;
    resize();
  }

  /** 每帧更新玻璃的深度归一化范围（uD0 / uDR）。 */
  function updateGlassRange() {
    const g = state.glass;
    if (!g) return;
    const p = new THREE.Vector3().setFromMatrixPosition(g.mesh.matrixWorld);
    p.applyMatrix4(camera.matrixWorldInverse);
    const dist = Math.max(-p.z, 0.1);
    const r = Math.max(g.mesh.scale.x, 1e-3) * 1.5;
    g.shared.uD0.value = dist - r;
    g.shared.uDR.value = 2 * r;
  }

  /** 主体在屏幕上的位置 → 接触阴影落点。 */
  function updateShadow() {
    const g = state.glass;
    if (!g) return;
    const p = new THREE.Vector3().setFromMatrixPosition(g.mesh.matrixWorld);
    p.project(camera);
    const uvx = p.x * 0.5 + 0.5;
    const uvy = p.y * 0.5 + 0.5;
    const s = g.mesh.scale.x;
    bg.uniforms.uShadow.value.set(uvx, uvy - 0.30 * s, 0.30 * s + 0.10);
  }

  function render() {
    camera.updateMatrixWorld();
    updateGlassRange();
    updateShadow();

    // Pass 1a —— 背景 → fboA
    renderer.setRenderTarget(fboA);
    renderer.clear(true, true, false);
    renderer.render(bgScene, fsCam);

    // Pass 1b —— 三态结构体 → fboCore（透明底）
    if (state.structure) {
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(fboCore);
      renderer.clear(true, true, false);
      renderer.render(scene, camera);
      renderer.setClearColor(0x000000, 1);
    }

    // Pass 2 —— 转场后处理 → fboB
    let src = fboA;
    if (state.useTransition && transition.uniforms.uAmt.value > 0.0015) {
      transition.uniforms.uTex.value = fboA.texture;
      renderer.setRenderTarget(fboB);
      renderer.clear(true, false, false);
      renderer.render(trScene, fsCam);
      src = fboB;
    }

    // Pass 3 —— 铺到屏幕
    renderer.setRenderTarget(null);
    renderer.clear(true, true, false);
    blitMat.uniforms.uTex.value = src.texture;
    renderer.render(blitScene, fsCam);

    // Pass 4/5 —— 玻璃
    const g = state.glass;
    if (g) {
      const front = g.mesh.material;
      g.mesh.material = g.depthMaterial;
      renderer.setRenderTarget(fboDepth);
      renderer.clear(true, true, false);
      renderer.render(glassScene, camera);

      g.mesh.material = front;
      g.uniforms.uBgTex.value = src.texture;
      g.uniforms.uDepthTex.value = fboDepth.texture;
      g.uniforms.uCoreTex.value = state.structure ? fboCore.texture : null;
      renderer.setRenderTarget(null);
      renderer.render(glassScene, camera);
    }
  }

  function dispose() {
    fboA.dispose(); fboB.dispose(); fboDepth.dispose(); fboCore.dispose();
    for (const t of wmCache.values()) t.dispose();
    renderer.dispose();
  }

  return {
    renderer, camera, scene, glassScene,
    bg, transition, state,
    setStructure, setGlass, setWatermark, resetWatermarks,
    resize, setFboScale, render, dispose,
  };
}
