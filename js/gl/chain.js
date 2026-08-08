/* ==========================================================================
   chain.js — 一条玻璃串珠链
   「一条链串联下来旋转」：九颗磨砂玻璃珠沿一条 S 形曲线排开，
   中间用细管相连，整条链缓缓绕 Y 轴旋转，像挂在天空里的项链。

   珠子的材质不是普通 Phong——它直接折射背景 FBO：
   顶点法线把屏幕 uv 推开一点点，玻璃边缘的色散边界由 Fresnel
   与楺光自然挂出来，不需要给珠子任何贴图。
   ========================================================================== */

import * as THREE from "three";

export const BEADS = 9;

function makeMaterial() {
  const uniforms = {
    uTex: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uSkyBottom: { value: new THREE.Color("#F9EAD9") },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vP = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec2 uResolution;
      uniform sampler2D uTex;
      uniform vec3 uSkyBottom;
      varying vec3 vN;
      varying vec3 vP;

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        vec3 V = normalize(-vP);
        float ndv = dot(vN, V);

        // —— 折射：法线把背景往后推，边界自然挂出细彩色边 ——
        vec2 sh = vN.xy * (0.055 * (1.0 - abs(vN.z)))
                + normalize(vN.xy + 1e-5) * 0.012;
        vec3 bg = texture2D(uTex, clamp(uv + sh, 0.0, 1.0)).rgb;

        // —— Fresnel 亮边：磨砂白，摸一摸夏天的薄膜 ——
        float fres = pow(1.0 - abs(ndv), 2.8);

        // —— 太阳楺光：固定太阳方向，高光点随链条转动扫过 ——
        vec3 L = normalize(vec3(0.42, 0.78, 0.48));
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(vN, H), 0.0), 46.0);
        spec *= 0.35 + 0.65 * pow(1.0 - abs(ndv), 2.0);

        // —— 地面反射的一点点奶桃色 ——
        float refl = pow(max(dot(reflect(-V, vN), L), 0.0), 3.0);

        vec3 col = bg * (0.78 + fres * 0.5);
        col += vec3(1.0, 0.985, 0.94) * fres * 1.15;
        col += vec3(1.0) * spec * 1.5;
        col += mix(vec3(1.0), uSkyBottom, 0.5) * refl * 0.22;
        float shade = clamp(ndv * 0.5 + 0.5, 0.0, 1.0);
        col *= 0.86 + 0.14 * shade;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return { material, uniforms };
}

export function buildChain() {
  const { material, uniforms } = makeMaterial();

  /* 曲线：挂在天空里的一条 S 形珠链 */
  const ctrl = [
    new THREE.Vector3(0.00, 1.22, 0.00),
    new THREE.Vector3(0.42, 0.88, 0.14),
    new THREE.Vector3(-0.36, 0.46, -0.08),
    new THREE.Vector3(0.36, 0.02, 0.08),
    new THREE.Vector3(-0.36, -0.46, -0.08),
    new THREE.Vector3(0.42, -0.88, 0.14),
    new THREE.Vector3(0.00, -1.22, 0.00),
  ];
  const curve = new THREE.CatmullRomCurve3(ctrl);

  const group = new THREE.Group();
  const beadR = 0.185;

  const beads = [];
  const links = [];

  const yAxis = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();

  for (let i = 0; i < BEADS; i++) {
    const t = i / (BEADS - 1);
    const p = curve.getPoint(t);
    const b = new THREE.Mesh(new THREE.SphereGeometry(beadR, 56, 40), material);
    b.position.copy(p);
    b.userData.phase = i * 1.35;
    group.add(b);
    beads.push(b);
  }
  for (let i = 0; i < BEADS - 1; i++) {
    const a = curve.getPoint(i / (BEADS - 1));
    const b = curve.getPoint((i + 1) / (BEADS - 1));
    dir.subVectors(b, a);
    const len = dir.length();
    const lk = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 1, 12, 1, true), material);
    mid.addVectors(a, b).multiplyScalar(0.5);
    lk.position.copy(mid);
    lk.quaternion.setFromUnitVectors(yAxis, dir.clone().normalize());
    lk.scale.y = len;
    group.add(lk);
  }

  group.frustumCulled = false;

  return {
    mesh: group,
    uniforms,
    /** dt = 帧时长；t = 动画时间（QA/reduced 时传入固定值，画面静止） */
    update(dt, t, frozen) {
      if (!frozen) {
        group.rotation.y += dt * 0.22;
        group.rotation.z = Math.sin(t * 0.45) * 0.05;
        for (const b of beads) {
          b.scale.setScalar(1 + 0.045 * Math.sin(t * 1.6 + b.userData.phase));
        }
      } else {
        group.rotation.y = 0.9;
        group.rotation.z = 0.0;
        for (const b of beads) b.scale.setScalar(1);
      }
    },
  };
}