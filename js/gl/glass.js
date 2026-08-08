/* ==========================================================================
   glass.js — 单一玻璃主体：刻面色散折射材质
   物理路线，不是 backdrop-filter：
     · 顶点：星凸支撑函数 R(d) —— 对节点球做 smooth-max，玻璃体真的包住内部结构
     · 法线：**每三角面一个常量法线**（面法线，非插值）——切割水晶而不是肥皂泡
     · 片元：按 R / G / B 各自的折射率取样背景 FBO（默认 9 段光谱）
     · 厚度：背面深度图 → Beer-Lambert 吸收
     · 边缘：Fresnel + 程序化 studio 环境（零 HDR 资产）+ 一圈墨色硬轮廓
   全站只出现这一次玻璃。不叠半透明卡片。

   为什么是刻面：
   42 个原子填满单位球，凸包 ≈ 球，光滑外壳永远读不出分子形状，
   只会得到一颗奶白珍珠。改成常量面法线后，每一面各自折射背景的不同位置，
   得到马赛克式的错位——这才是「真的在折射」的视觉证据，而不是一层雾。
   ========================================================================== */

import * as THREE from "three";

export const MAXG = 16;   // 有向图节点上限
export const MAXM = 48;   // 分子原子上限

/* 共享的形状函数：顶点着色器与背面深度着色器必须完全一致 */
const SHAPE_GLSL = /* glsl */ `
  uniform float uMorph;
  uniform float uTime;
  uniform float uTurb;
  uniform vec4  uGNodes[${MAXG}];
  uniform int   uGCount;
  uniform vec4  uMNodes[${MAXM}];
  uniform int   uMCount;

  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float n = 0.0;
    for (int dx = 0; dx < 2; dx++)
    for (int dy = 0; dy < 2; dy++)
    for (int dz = 0; dz < 2; dz++) {
      vec3 o = vec3(float(dx), float(dy), float(dz));
      float w = mix(1.0 - u.x, u.x, o.x) * mix(1.0 - u.y, u.y, o.y) * mix(1.0 - u.z, u.z, o.z);
      n += w * hash3(i + o).x;
    }
    return n;
  }
  float fbm(vec3 p) { return vnoise(p) * 0.62 + vnoise(p * 2.07) * 0.26 + vnoise(p * 4.13) * 0.12; }

  float smax(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
    return mix(b, a, h) + k * h * (1.0 - h);
  }

  // 节点云在方向 d 上的光滑支撑半径
  float supportG(vec3 d) {
    float r = -1e3;
    for (int i = 0; i < ${MAXG}; i++) {
      if (i >= uGCount) break;
      r = smax(r, dot(uGNodes[i].xyz, d) + uGNodes[i].w, 0.09);
    }
    return r;
  }
  float supportM(vec3 d) {
    float r = -1e3;
    for (int i = 0; i < ${MAXM}; i++) {
      if (i >= uMCount) break;
      r = smax(r, dot(uMNodes[i].xyz, d) + uMNodes[i].w, 0.07);
    }
    return r;
  }

  // 三态半径场：流体 → 有向图 → 分子
  // 流体下界锁在 0.99：内部线结构最远只到 0.85，永远不会从壳里探出来。
  float radiusField(vec3 d) {
    float m = clamp(uMorph, 0.0, 2.0);
    // 低频大尺度：要的是几块大晶面，不是一层麻点
    // 幅度压到 0.26：1.5× 的半径起伏读作花生/软糖，1.26× 才读作切割宝石
    float n = fbm(d * 1.15 + vec3(0.0, uTime * 0.11 * uTurb, uTime * 0.06 * uTurb)) * 0.5 + 0.5;
    float rGem = 1.00 + n * 0.26;
    // 壳在结构的节点处隆起，但只走 6 成——纯支撑函数会把 9 层 DAG 拉成花生，
    // 掺回宝石球才守得住晶体轮廓。往大球方向掺永远不会夹到内部结构。
    float rG = mix(rGem, supportG(d), 0.60);
    // 分子态壳在第 5 幕最大（scale 0.94）、又画在平色场上，只剩轮廓在说话：
    // 0.66 的支撑权重会把 42 原子的凸包读成变形虫，压到 0.48 才守得住晶体。
    float rM = mix(rGem, supportM(d), 0.48);
    float r;
    if (m <= 1.0) {
      float t = m * m * (3.0 - 2.0 * m);
      r = mix(rGem, rG, t);
    } else {
      float t = m - 1.0; t = t * t * (3.0 - 2.0 * t);
      r = mix(rG, rM, t);
    }
    // 永远保留一点呼吸，避免形变结束后变成死物
    return r * (1.0 + 0.008 * sin(uTime * 0.55));
  }

  vec3 surfacePoint(vec3 d) { return d * radiusField(d); }
`;

/* --------------------------------------------------------------------------
   程序化 studio 环境 —— 不下载任何 HDR，颜色与色板联动
   上亮下沉的柔光箱：给刻面之间拉开明度差，玻璃才有体积
   -------------------------------------------------------------------------- */
const ENV_GLSL = /* glsl */ `
  uniform vec3 uEnvTop;
  uniform vec3 uEnvBottom;
  uniform vec3 uEnvKey;
  vec3 studioEnv(vec3 dir) {
    float h = dir.y * 0.5 + 0.5;
    vec3 base = mix(uEnvBottom, uEnvTop, smoothstep(0.0, 1.0, h));
    // 主光：左上大柔光板
    float key = pow(max(dot(dir, normalize(vec3(-0.55, 0.78, 0.32))), 0.0), 9.0);
    // 补光：右下窄条
    float fill = pow(max(dot(dir, normalize(vec3(0.75, -0.35, 0.55))), 0.0), 22.0);
    return base + uEnvKey * (key * 0.85 + fill * 0.5);
  }
`;

/* --------------------------------------------------------------------------
   刻面几何：IcosahedronGeometry 是 non-indexed（每三个顶点 = 一个三角面），
   给每个顶点挂上同面另外两个顶点的方向 aB / aC，以及重心坐标 aBary。
   顶点着色器由此算出**每面常量**的法线，并能在片元里画出刻面棱线。
   -------------------------------------------------------------------------- */
function facetGeometry(detail) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  if (g.index) { const n = g.toNonIndexed(); g.dispose(); g = n; }
  const pos = g.getAttribute("position");
  const n = pos.count;
  const aB = new Float32Array(n * 3);
  const aC = new Float32Array(n * 3);
  const aBary = new Float32Array(n * 3);
  for (let t = 0; t + 2 < n; t += 3) {
    for (let k = 0; k < 3; k++) {
      const i0 = t + k, i1 = t + ((k + 1) % 3), i2 = t + ((k + 2) % 3);
      aB[i0 * 3] = pos.getX(i1); aB[i0 * 3 + 1] = pos.getY(i1); aB[i0 * 3 + 2] = pos.getZ(i1);
      aC[i0 * 3] = pos.getX(i2); aC[i0 * 3 + 1] = pos.getY(i2); aC[i0 * 3 + 2] = pos.getZ(i2);
      aBary[i0 * 3 + k] = 1;
    }
  }
  g.setAttribute("aB", new THREE.BufferAttribute(aB, 3));
  g.setAttribute("aC", new THREE.BufferAttribute(aC, 3));
  g.setAttribute("aBary", new THREE.BufferAttribute(aBary, 3));
  return g;
}

/** 1×1 全透明贴图：没有结构体时的安全默认值（采样 null sampler 会拿到白色）。 */
let _emptyCore = null;
function emptyCore() {
  if (!_emptyCore) {
    _emptyCore = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    _emptyCore.needsUpdate = true;
  }
  return _emptyCore;
}

/* --------------------------------------------------------------------------
   构建玻璃主体
   -------------------------------------------------------------------------- */
export function buildGlass({ detail = 5, samples = 9 } = {}) {
  const geometry = facetGeometry(detail);

  const shared = {
    uMorph:   { value: 0 },
    uTime:    { value: 0 },
    uTurb:    { value: 1 },
    uGNodes:  { value: Array.from({ length: MAXG }, () => new THREE.Vector4()) },
    uGCount:  { value: 0 },
    uMNodes:  { value: Array.from({ length: MAXM }, () => new THREE.Vector4()) },
    uMCount:  { value: 0 },
    uD0:      { value: 1 },
    uDR:      { value: 4 },
  };

  /* ---------- 背面深度：写归一化视距到 R 通道 ---------- */
  const depthMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: shared,
    vertexShader: /* glsl */ `
      ${SHAPE_GLSL}
      varying float vViewDist;
      void main() {
        vec3 d = normalize(position);
        vec3 p = surfacePoint(d);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vViewDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uD0; uniform float uDR;
      varying float vViewDist;
      void main() {
        float n = clamp((vViewDist - uD0) / uDR, 0.0, 1.0);
        gl_FragColor = vec4(n, n, n, 1.0);
      }
    `,
  });

  /* ---------- 正面：刻面色散折射 ---------- */
  const uniforms = Object.assign({}, shared, {
    uBgTex:      { value: null },
    uDepthTex:   { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uIor:        { value: 1.46 },
    // 色散调到「能看到细边」而不是「满屏彩雾」——夏日光要克制
    uDispersion: { value: 0.055 },
    // 折射位移用**归一化厚度**驱动。旧版用世界厚度，位移能穿透到 1.8 个 uv，
    // 全被 clamp 到贴图边缘 → 屏幕上就是那些奶白横向拉丝。
    // 色散只有背景有对比度时才看得见。天空的光带与云边就是最诚实的被折射物：
    // 折射强度够让光带、云边被明显掰弯，逐波长取样才会在弯折处挂出柔和彩边。
    uRefract:    { value: 0.24 },
    // Beer-Lambert：蓝端吸收略强 → 厚处沉成淡淡薰衣草色，薄处近乎晶莹。
    // 体积感主要来自这条曲线 + 面间明度差，而不是描边。
    uAbsorb:     { value: new THREE.Color(0.10, 0.10, 0.20) },
    uThick:      { value: 0.7 },
    uFresnel:    { value: 2.2 },
    uRim:        { value: new THREE.Color("#C3CBF5") },
    uEnvTop:     { value: new THREE.Color("#FFFDF4") },
    uEnvBottom:  { value: new THREE.Color("#A9B6E6") },
    uEnvKey:     { value: new THREE.Color("#FFE9C4") },
    uEdge:       { value: new THREE.Color("#52698C") },  // 刻面棱线：极淡的雾蓝
    uEdgeAmt:    { value: 0.12 },
    uCoreTex:    { value: emptyCore() },   // 内部的结构体（带 alpha）
    uCoreRefract:{ value: 0.050 },         // 内含物只经一次界面，位移远小于背景
    // 玻璃里外都很亮——需要丰盈柔光，刻面色散不够强
    uFacetLo:    { value: 0.86 },          // 每面明度调制下界
    uFacetHi:    { value: 1.10 },          // 上界
    uFacetJit:   { value: 0.015 },                        // 每面折射率微差
    uPointer:    { value: new THREE.Vector2(9, 9) },      // 屏外 = 无扰动
    uLens:       { value: 0.0 },
    uOpacity:    { value: 1.0 },
  });

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    defines: { SAMPLES: samples },
    vertexShader: /* glsl */ `
      ${SHAPE_GLSL}
      attribute vec3 aB;
      attribute vec3 aC;
      attribute vec3 aBary;
      varying vec3  vWorld;
      varying vec3  vNormal2;
      varying float vViewDist;
      varying vec3  vBary;
      varying float vFacet;
      void main() {
        vec3 dA = normalize(position);
        vec3 dB = normalize(aB);
        vec3 dC = normalize(aC);

        vec3 pA = surfacePoint(dA);
        // 同一三角面的三个顶点算出同一个法线 → 常量面法线 → 硬刻面
        vec3 pB = surfacePoint(dB);
        vec3 pC = surfacePoint(dC);
        vec3 n = normalize(cross(pB - pA, pC - pA));
        vec3 fc = normalize(dA + dB + dC);
        if (dot(n, fc) < 0.0) n = -n;

        vBary = aBary;
        vFacet = fract(sin(dot(fc, vec3(37.13, 17.71, 91.37))) * 4137.13);

        vec4 wp = modelMatrix * vec4(pA, 1.0);
        vWorld = wp.xyz;
        vNormal2 = normalize(mat3(modelMatrix) * n);
        vec4 mv = viewMatrix * wp;
        vViewDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      ${ENV_GLSL}
      uniform sampler2D uBgTex;
      uniform sampler2D uDepthTex;
      uniform sampler2D uCoreTex;
      uniform float uCoreRefract;
      uniform float uFacetLo;
      uniform float uFacetHi;
      uniform vec2  uResolution;
      uniform float uIor;
      uniform float uDispersion;
      uniform float uRefract;
      uniform vec3  uAbsorb;
      uniform float uThick;
      uniform float uFresnel;
      uniform vec3  uRim;
      uniform vec3  uEdge;
      uniform float uEdgeAmt;
      uniform float uFacetJit;
      uniform vec2  uPointer;
      uniform float uLens;
      uniform float uOpacity;
      uniform float uD0; uniform float uDR;

      varying vec3  vWorld;
      varying vec3  vNormal2;
      varying float vViewDist;
      varying vec3  vBary;
      varying float vFacet;

      // 波长 → RGB 响应（三个高斯瓣近似 CIE 曲线）
      vec3 spectralWeight(float f) {
        float w = 400.0 + f * 300.0;            // 400–700 nm
        float r = exp(-pow((w - 610.0) / 52.0, 2.0));
        float g = exp(-pow((w - 545.0) / 48.0, 2.0));
        float b = exp(-pow((w - 460.0) / 48.0, 2.0));
        return vec3(r, g, b);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        vec3 N = normalize(vNormal2);
        vec3 I = normalize(vWorld - cameraPosition);

        // 光标处的局部透镜扰动
        float pd = distance(uv, uPointer);
        float lens = uLens * exp(-pd * pd * 42.0);
        N = normalize(N + vec3(uv - uPointer, 0.0) * lens * 3.2);

        // 厚度：背面归一化视距 - 正面归一化视距（0..1）
        float backN  = texture2D(uDepthTex, uv).r;
        float frontN = clamp((vViewDist - uD0) / uDR, 0.0, 1.0);
        float thN = clamp(backN - frontN, 0.0, 1.0);
        float thickness = thN * uDR;

        // 逐通道折射取样；每个刻面再叠一点自己的折射率（真水晶不是均质体）
        float jit = (vFacet - 0.5) * uFacetJit;
        vec3 acc = vec3(0.0);
        vec3 wsum = vec3(1e-5);
        for (int i = 0; i < SAMPLES; i++) {
          float f = float(i) / float(SAMPLES - 1);
          float ior = uIor + uDispersion * (f - 0.5) * 2.0 + jit;
          vec3 R1 = refract(I, N, 1.0 / ior);
          vec2 duv = R1.xy * uRefract * (0.12 + thN * 0.88);
          vec3 s = texture2D(uBgTex, clamp(uv + duv, vec2(0.002), vec2(0.998))).rgb;
          vec3 w = spectralWeight(f);
          acc += s * w;
          wsum += w;
        }
        vec3 refracted = acc / wsum;

        // 内含结构：三次弱折射取样，R/G/B 各取各的 —— 细线上会挂出色散边
        float cs = uCoreRefract * (0.10 + thN * 0.90);
        vec4 cR = texture2D(uCoreTex, clamp(uv + refract(I, N, 1.0 / (uIor - uDispersion)).xy * cs, vec2(0.002), vec2(0.998)));
        vec4 cG = texture2D(uCoreTex, clamp(uv + refract(I, N, 1.0 / uIor).xy                     * cs, vec2(0.002), vec2(0.998)));
        vec4 cB = texture2D(uCoreTex, clamp(uv + refract(I, N, 1.0 / (uIor + uDispersion)).xy * cs, vec2(0.002), vec2(0.998)));
        vec3 coreRGB = vec3(cR.r, cG.g, cB.b);              // FBO 里已是预乘 alpha
        float coreA = (cR.a + cG.a + cB.a) / 3.0;
        vec3 inner = refracted * (1.0 - coreA) + coreRGB;

        // Beer-Lambert 吸收：厚的地方更暖更沉
        inner *= exp(-uAbsorb * thickness * uThick);

        // Fresnel + 环境反射（压住反射占比，让折射内容当主角）
        float cosT = clamp(dot(-I, N), 0.0, 1.0);
        float F = pow(1.0 - cosT, uFresnel);
        vec3 refl = studioEnv(reflect(I, N));

        vec3 col = mix(inner, refl, clamp(F * 0.72, 0.0, 0.64));
        // 每面常量明度调制：切割水晶靠的是面与面之间的曝光差，不是描边
        float facetLum = dot(N, normalize(vec3(-0.55, 0.78, 0.32))) * 0.5 + 0.5;
        col *= mix(uFacetLo, uFacetHi, facetLum);
        // 边缘色散提示：薰衣草柔光，不抢戏
        col += uRim * pow(F, 1.5) * 0.22;
        // 高光：太阳在玻璃上的一颗星
        float spec = pow(max(dot(reflect(I, N), normalize(vec3(-0.55, 0.78, 0.32))), 0.0), 64.0);
        col += vec3(spec) * 0.55;

        // 刻面棱线：重心坐标最小分量 → 三角形边界。
        // 刻意不用 fwidth（GLSL ES 1.00 导数扩展），线宽按重心空间给固定比例。
        // 棱线只在边缘一圈加重：正面几乎不描边，避免变成一个测地线线框球。
        float bmin = min(min(vBary.x, vBary.y), vBary.z);
        float wire = 1.0 - smoothstep(0.010, 0.040, bmin);
        float outline = smoothstep(0.42, 1.00, F);
        col = mix(col, uEdge, clamp(wire * uEdgeAmt * (0.08 + 0.55 * outline) + outline * uEdgeAmt * 0.30, 0.0, 0.55));

        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;

  return {
    mesh, material, depthMaterial, uniforms, shared,

    setNodes(graphNodes, molNodes) {
      const g = uniforms.uGNodes.value, m = uniforms.uMNodes.value;
      const gn = Math.min(graphNodes.length, MAXG);
      const mn = Math.min(molNodes.length, MAXM);
      for (let i = 0; i < gn; i++) g[i].copy(graphNodes[i]);
      for (let i = 0; i < mn; i++) m[i].copy(molNodes[i]);
      uniforms.uGCount.value = gn;
      uniforms.uMCount.value = mn;
    },

    setDetail(detail) {
      const next = facetGeometry(detail);
      mesh.geometry.dispose();
      mesh.geometry = next;
    },

    setSamples(n) {
      if (material.defines.SAMPLES === n) return;
      material.defines.SAMPLES = n;
      material.needsUpdate = true;
    },
  };
}
