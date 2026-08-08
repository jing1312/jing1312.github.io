/* ==========================================================================
   morph.js — 三态形变结构体
   一个 BufferGeometry，三套顶点属性：
     position   流体（curl 流场短线段）
     aGraph     daily-digital-twin 的执行有向图
     aMolecule  青蒿素球棍骨架
   顶点着色器按 uniform uMorph 插值，每顶点带错峰延迟（aDelay）。
   全程一个 draw call、一套材质。

   这个结构体位于玻璃主体内部，所以它先被画进背景 FBO，
   再由玻璃按 R/G/B 各自的折射率取样——形变是被真实折射的。
   ========================================================================== */

import * as THREE from "three";
import { seededRandom } from "../util/anim.js";

/* --------------------------------------------------------------------------
   1. 执行有向图（结构取自 daily-digital-twin README 的架构图与状态表）
   -------------------------------------------------------------------------- */
export const GRAPH = {
  nodes: [
    { id: "feishu",  layer: 0, slot: 0, of: 1, label: "飞书任务" },
    { id: "model",   layer: 1, slot: 0, of: 1, label: "远端模型 · 不可信计划" },
    { id: "policy",  layer: 2, slot: 0, of: 1, label: "策略审查" },
    { id: "slots",   layer: 3, slot: 0, of: 2, label: "资源槽位 · fail-closed" },
    { id: "human",   layer: 3, slot: 1, of: 2, label: "人工确认门" },
    { id: "exec",    layer: 4, slot: 0, of: 1, label: "受控执行" },
    { id: "browser", layer: 5, slot: 0, of: 3, label: "浏览器适配器" },
    { id: "desktop", layer: 5, slot: 1, of: 3, label: "桌面适配器" },
    { id: "file",    layer: 5, slot: 2, of: 3, label: "文件适配器" },
    { id: "evPage",  layer: 6, slot: 0, of: 3, label: "页面证据" },
    { id: "evWin",   layer: 6, slot: 1, of: 3, label: "进程 / 窗口证据" },
    { id: "evFile",  layer: 6, slot: 2, of: 3, label: "文件证据" },
    { id: "gate",    layer: 7, slot: 0, of: 1, label: "证据核验", gate: true },
    { id: "receipt", layer: 8, slot: 0, of: 2, label: "脱敏回执 · done" },
    { id: "partial", layer: 8, slot: 1, of: 2, label: "降级 · partial" },
  ],
  edges: [
    ["feishu", "model"], ["model", "policy"],
    ["policy", "slots"], ["policy", "human"],
    ["slots", "exec"], ["human", "exec"],
    ["exec", "browser"], ["exec", "desktop"], ["exec", "file"],
    ["browser", "evPage"], ["desktop", "evWin"], ["file", "evFile"],
    ["evPage", "gate"], ["evWin", "gate"], ["evFile", "gate"],
    ["gate", "receipt"], ["gate", "partial"],
  ],
};

function graphLayout() {
  const L = 8;
  const pos = new Map();
  for (const n of GRAPH.nodes) {
    const x = (n.layer / L) * 2 - 1;
    // 同层节点在 yz 平面上撑开，避免退化成一条直线
    const a = n.of === 1 ? 0 : (n.slot / (n.of - 1) - 0.5) * Math.PI * 0.9;
    const spread = n.of === 1 ? 0 : 0.42;
    const y = Math.sin(a) * spread + Math.sin(n.layer * 1.7) * 0.1;
    const z = Math.cos(a) * spread * 0.75 - 0.18 + Math.cos(n.layer * 2.1) * 0.09;
    pos.set(n.id, new THREE.Vector3(x * 0.92, y, z));
  }
  // 归一化到单位最大半径
  let rmax = 0;
  for (const v of pos.values()) rmax = Math.max(rmax, v.length());
  for (const v of pos.values()) v.multiplyScalar(1 / rmax);
  return pos;
}

/* --------------------------------------------------------------------------
   2. 元素半径（相对值，用于原子壳层大小与玻璃体隆起）
   -------------------------------------------------------------------------- */
const EL_R = { H: 0.42, C: 0.72, O: 0.68, N: 0.70, S: 0.85 };
const elRadius = (el) => EL_R[el] ?? 0.65;

/* --------------------------------------------------------------------------
   3. 生成三态线段
   每个 target 都要产出恰好 SEG 条线段（2 顶点/条），顺序一致。
   -------------------------------------------------------------------------- */
const SEG = 2400;
// 少而长 > 多而短：200×12 的短棍会糊成钢丝球，80×30 才读得出「一条流线」。
const FLUID_LINES = 48;                   // 流线条数
const FLUID_STEPS = SEG / FLUID_LINES;    // 每条 50 段
const FLUID_RMAX = 0.84;                  // 流体态最远半径（玻璃壳下界 0.92，留余量）

/**
 * 流体态 = 48 条积分流线，不是 2400 根随机短棍。
 *
 * 流场 = 被球壳「关起来」的 ABC（Arnold–Beltrami–Childress）流。
 * 直接拿 ABC 会有两个问题：流线会漂出玻璃壳；随手加一项向心力把它们拽回来，
 * 又会破坏无散度性质、造出汇点——流线全部塌进几个黑点。
 *
 * 正确做法是把速度场写成一个旋度，散度就恒等于零：
 *
 *     v = ∇ × ( g(r) · P(Kx) ) = g(r)·K·P  +  g'(r)·( r̂ × P )
 *
 * 其中 P 是 ABC 场，满足 Beltrami 恒等式 ∇×P = K·P；g(r) = (1 - (r/R)²)²。
 * 因为 g(R) = 0，壳上只剩 g'(R)(r̂ × P)，它恒与 r̂ 垂直 ⇒ 速度严格切于球面，
 * 流线在数学上就出不去，不需要任何夹取。
 *
 * 数值验证见 tools/check_fluid.py：
 *   |div v| ≤ 2.5e-9 · |v·r̂| 在 r=R 处 ≤ 1.5e-30 · 积分最大半径 0.824 < R=0.84
 *   · 无停滞点（速度 5 分位 1.16，中位 3.60）
 */
function fluidSegments(rng) {
  const out = new Float32Array(SEG * 6);
  const KA = Math.SQRT2, KB = 1.0, KC = Math.sqrt(3);
  const K = 1.55;      // 空间频率：单位球内约一个大涡
  const H = 0.032;     // 弧长步长（速度已归一化）→ 每条线弧长 1.60
  const R = FLUID_RMAX;

  const p = new THREE.Vector3(), vel = new THREE.Vector3(), q = new THREE.Vector3();
  const P = new THREE.Vector3(), rh = new THREE.Vector3();

  const field = (o, target, sign) => {
    const x = o.x * K, y = o.y * K, z = o.z * K;
    P.set(
      KA * Math.sin(z) + KC * Math.cos(y),
      KB * Math.sin(x) + KA * Math.cos(z),
      KC * Math.sin(y) + KB * Math.cos(x),
    );
    const r = o.length();
    const t = r / R, u = 1 - t * t;
    const g = u * u;                       // g(R) = 0
    const gp = -4 * r * u / (R * R);       // g'(r)
    target.copy(P).multiplyScalar(g * K);
    if (r > 1e-9) {
      rh.copy(o).multiplyScalar(1 / r).cross(P);
      target.addScaledVector(rh, gp);
    }
    const len = target.length();
    if (len < 1e-6) target.set(0, 1, 0); else target.multiplyScalar(1 / len);
    return target.multiplyScalar(sign);
  };

  const step = (sign) => {                     // RK2 中点法
    field(p, vel, sign);
    q.copy(p).addScaledVector(vel, H * 0.5);
    field(q, vel, sign);
    p.addScaledVector(vel, H);           // 切向条件保证不越界，无需夹取
  };

  let w = 0;
  for (let L = 0; L < FLUID_LINES; L++) {
    const u = rng(), s = rng(), rr = Math.cbrt(rng()) * 0.78 * R;
    const theta = 2 * Math.PI * u, phi = Math.acos(2 * s - 1);
    p.set(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(rr);
    for (let k = 0; k < FLUID_STEPS / 2; k++) step(-1);   // 先回溯半条，线段以种子为中心
    for (let k = 0; k < FLUID_STEPS; k++) {
      const ax = p.x, ay = p.y, az = p.z;
      step(1);
      out[w++] = ax; out[w++] = ay; out[w++] = az;
      out[w++] = p.x; out[w++] = p.y; out[w++] = p.z;
    }
  }

  // 去质心：整团流体正好坐在玻璃壳中心（位移量很小，不会把点推出壳）
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < out.length; i += 3) { cx += out[i]; cy += out[i + 1]; cz += out[i + 2]; }
  const n = out.length / 3;
  cx /= n; cy /= n; cz /= n;
  for (let i = 0; i < out.length; i += 3) {
    out[i] -= cx; out[i + 1] -= cy; out[i + 2] -= cz;
    const r = Math.hypot(out[i], out[i + 1], out[i + 2]);
    if (r > R) { const s = R / r; out[i] *= s; out[i + 1] *= s; out[i + 2] *= s; }
  }
  return out;
}

/** 把「边（细分成小段）+ 节点环」摊到固定数量的线段上。 */
function skeletonSegments(nodes, edges, nodeRadius, rng, ringsPerNode = 14, edgeDiv = 10) {
  const items = [];   // 每项 = [ax,ay,az, bx,by,bz]
  const A = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3(), Q = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), dir = new THREE.Vector3();

  // 边：等分成短段（留出端点空隙，视觉上像球棍）
  for (const [a, b] of edges) {
    A.copy(nodes.get(a)); B.copy(nodes.get(b));
    const ra = nodeRadius(a) * 0.055, rb = nodeRadius(b) * 0.055;
    dir.subVectors(B, A);
    const len = dir.length(); dir.normalize();
    const s0 = ra / Math.max(len, 1e-4), s1 = 1 - rb / Math.max(len, 1e-4);
    for (let k = 0; k < edgeDiv; k++) {
      const t0 = s0 + (s1 - s0) * (k / edgeDiv);
      const t1 = s0 + (s1 - s0) * ((k + 0.72) / edgeDiv);
      P.copy(A).addScaledVector(dir, len * t0);
      Q.copy(A).addScaledVector(dir, len * t1);
      items.push([P.x, P.y, P.z, Q.x, Q.y, Q.z]);
    }
  }

  // 节点：三个正交小圆环，读起来像一颗球
  for (const [id, c] of nodes) {
    const r = nodeRadius(id) * 0.055;
    for (let plane = 0; plane < 3; plane++) {
      if (plane === 0) { e1.set(1, 0, 0); e2.set(0, 1, 0); }
      else if (plane === 1) { e1.set(0, 1, 0); e2.set(0, 0, 1); }
      else { e1.set(0, 0, 1); e2.set(1, 0, 0); }
      for (let k = 0; k < ringsPerNode; k++) {
        const a0 = (k / ringsPerNode) * Math.PI * 2;
        const a1 = ((k + 0.78) / ringsPerNode) * Math.PI * 2;
        P.copy(c).addScaledVector(e1, Math.cos(a0) * r).addScaledVector(e2, Math.sin(a0) * r);
        Q.copy(c).addScaledVector(e1, Math.cos(a1) * r).addScaledVector(e2, Math.sin(a1) * r);
        items.push([P.x, P.y, P.z, Q.x, Q.y, Q.z]);
      }
    }
  }

  // 摊平到恰好 SEG 条：不足则循环取样并加微扰，多余则均匀抽稀
  const out = new Float32Array(SEG * 6);
  for (let i = 0; i < SEG; i++) {
    const src = items[Math.floor((i * items.length) / SEG) % items.length];
    const j = rng() * 0.006 - 0.003;
    const o = i * 6;
    for (let k = 0; k < 6; k++) out[o + k] = src[k] + j;
  }
  return out;
}

/* --------------------------------------------------------------------------
   4. 构建 geometry + material
   -------------------------------------------------------------------------- */
export function buildStructure(moleculeJson) {
  const rng = seededRandom(0x5eed1312);

  /* --- 流体 --- */
  const fluid = fluidSegments(rng);

  /* --- 有向图 --- */
  const gpos = graphLayout();
  const gRad = (id) => (GRAPH.nodes.find((n) => n.id === id)?.gate ? 1.55 : 1.0);
  const graph = skeletonSegments(gpos, GRAPH.edges, gRad, rng, 12, 9);

  /* --- 分子 --- */
  const mnodes = new Map();
  moleculeJson.atoms.forEach((a, i) => mnodes.set(i, new THREE.Vector3(a.x, a.y, a.z).multiplyScalar(0.92)));
  const medges = moleculeJson.bonds.map(([i, j]) => [i, j]);
  const mRad = (i) => elRadius(moleculeJson.atoms[i].el) * 1.25;
  const molecule = skeletonSegments(mnodes, medges, mRad, rng, 10, 7);

  /* --- 错峰延迟：按线段（两个顶点同值）
         同一条流线共享一个基准延迟 + 沿线渐进，形变时整条流线像被抽走一样解体 --- */
  const lineSeed = Array.from({ length: FLUID_LINES }, () => rng());
  const delay = new Float32Array(SEG * 2);
  for (let i = 0; i < SEG; i++) {
    const d = lineSeed[Math.floor(i / FLUID_STEPS)] * 0.62 + ((i % FLUID_STEPS) / FLUID_STEPS) * 0.38;
    delay[i * 2] = d; delay[i * 2 + 1] = d;
  }
  /* --- 每顶点随机相位，用于流体扰动 --- */
  const phase = new Float32Array(SEG * 2);
  for (let i = 0; i < SEG * 2; i++) phase[i] = rng() * 6.2831853;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(fluid, 3));
  geo.setAttribute("aGraph", new THREE.BufferAttribute(graph, 3));
  geo.setAttribute("aMolecule", new THREE.BufferAttribute(molecule, 3));
  geo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geo.computeBoundingSphere();

  const uniforms = {
    uMorph:   { value: 0 },
    uTime:    { value: 0 },
    uInkA:    { value: new THREE.Color("#12100E") },
    uInkB:    { value: new THREE.Color("#2B1BFF") },
    uOpacity: { value: 0.9 },
    uTurb:    { value: 1.0 },   // 流体扰动强度（Act 2 加剧）
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aGraph;
      attribute vec3 aMolecule;
      attribute float aDelay;
      attribute float aPhase;

      uniform float uMorph;   // 0 流体 → 1 有向图 → 2 分子
      uniform float uTime;
      uniform float uTurb;

      varying float vFade;
      varying float vSeg;

      // 每顶点错峰：形变呈流动，而不是整体切换
      float staggered(float t, float d) {
        float w = 0.45;                       // 错峰窗口
        float s = clamp((t - d * w) / (1.0 - w), 0.0, 1.0);
        return s * s * (3.0 - 2.0 * s);
      }

      // 廉价 3D 值噪声（确定性，无纹理依赖）
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
      vec3 curl(vec3 p) {
        float e = 0.28;
        float x1 = vnoise(p + vec3(0.0, e, 0.0)), x2 = vnoise(p - vec3(0.0, e, 0.0));
        float y1 = vnoise(p + vec3(0.0, 0.0, e)), y2 = vnoise(p - vec3(0.0, 0.0, e));
        float z1 = vnoise(p + vec3(e, 0.0, 0.0)), z2 = vnoise(p - vec3(e, 0.0, 0.0));
        return normalize(vec3(x1 - x2 - (y1 - y2), y1 - y2 - (z1 - z2), z1 - z2 - (x1 - x2)) + 1e-5);
      }

      void main() {
        float m = uMorph;
        vec3 p;
        if (m <= 1.0) {
          p = mix(position, aGraph, staggered(m, aDelay));
        } else {
          p = mix(aGraph, aMolecule, staggered(m - 1.0, aDelay));
        }

        // 流体态才有 curl 位移；形变推进时衰减
        float fluidAmt = (1.0 - clamp(m, 0.0, 1.0)) * uTurb;
        if (fluidAmt > 0.001) {
          vec3 c = curl(p * 1.9 + vec3(0.0, uTime * 0.13, uTime * 0.07));
          p += c * 0.085 * fluidAmt;   // 幅度受限：加上它也不能顶穿玻璃壳
        }
        // 分子态：轻微呼吸，避免死板
        p *= 1.0 + 0.012 * sin(uTime * 0.7 + aPhase);

        vSeg = aDelay;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // 近处更实。基准取相机到主体的实际距离（4.6），前后各一个半径，
        // 否则整个结构体都落在 clamp 的下界上，线全都淡成同一档。
        vFade = clamp((mv.z + 5.7) / 2.4, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uInkA;
      uniform vec3 uInkB;
      uniform float uOpacity;
      uniform float uMorph;
      varying float vFade;
      varying float vSeg;
      void main() {
        vec3 col = mix(uInkA, uInkB, smoothstep(0.25, 0.95, vSeg) * 0.55 + clamp(uMorph, 0.0, 2.0) * 0.12);
        // 1px 线经过 9 段光谱折射会被平均掉，起始不透明度必须够高才留得下
        float a = uOpacity * (0.52 + 0.48 * vFade);
        gl_FragColor = vec4(col, a);
      }
    `,
  });

  const mesh = new THREE.LineSegments(geo, material);
  mesh.frustumCulled = false;

  /* 玻璃体隆起用的节点位置（xyz + 半径） */
  const graphNodes = [...gpos.values()].map((v) => new THREE.Vector4(v.x, v.y, v.z, 0.30));
  const molNodes = moleculeJson.atoms.map((a, i) =>
    new THREE.Vector4(a.x * 0.92, a.y * 0.92, a.z * 0.92, 0.10 + elRadius(a.el) * 0.20));

  return { mesh, material, uniforms, graphNodes, molNodes, segmentCount: SEG };
}
