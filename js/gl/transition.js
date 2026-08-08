/* ==========================================================================
   transition.js — 着色器页面转场 · 梦幻夏日版
   不是淡入淡出，也不是撕裂胶片；是「阳光擦过玻璃」：
     · 一缕光带从滚动方向扫过
     · 整体极轻的暖色提升（像隔着气泡看）
     · 径向色差极轻微（和玻璃色散同源，但只在快速滚动时露头）
     · 软雾化边缘（强度高时微微糊边，制造「眨眼」感）
   强度 uAmt 由滚动速度驱动，静止时为 0，此 pass 直接被跳过。
   ========================================================================== */

import * as THREE from "three";

export function createTransition() {
  const uniforms = {
    uTex:  { value: null },
    uRes:  { value: new THREE.Vector2(1, 1) },
    uAmt:  { value: 0 },     // 0 → 1
    uDir:  { value: 1 },     // 滚动方向：+1 向下，-1 向上
    uSeed: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTex;
      uniform vec2  uRes;
      uniform float uAmt, uDir, uSeed;

      void main() {
        float a = clamp(uAmt, 0.0, 1.0);
        vec2 uv = vUv;
        vec2 c = uv - 0.5;

        // 光带：从滚动方向扫过的一条柔光
        float band = exp(-pow((uv.y - (0.5 - uDir * a * 0.35)) / 0.10, 2.0));

        // 极轻微的水平色差（滚得越快越明显，静止为零）
        vec2 off = c * a * 0.012;
        vec3 col;
        col.r = texture2D(uTex, clamp(uv + off * 0.6, vec2(0.0), vec2(1.0))).r;
        col.g = texture2D(uTex, clamp(uv - off * 0.2, vec2(0.0), vec2(1.0))).g;
        col.b = texture2D(uTex, clamp(uv - off * 0.8, vec2(0.0), vec2(1.0))).b;

        // 光带加柔白，整体轻微提亮（气泡感）
        col = mix(col, vec3(1.0), band * a * 0.22);
        col *= 1.0 + a * 0.05;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  return { material, uniforms };
}