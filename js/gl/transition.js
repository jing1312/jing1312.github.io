/* ==========================================================================
   transition.js — 着色器页面转场
   不是淡入淡出，是把整幅画面当成一张被拉扯的胶片：
     · 竖向剪切（scroll 方向驱动）
     · 桶形 warp（离中心越远拉得越狠）
     · 色度分离（R / G / B 沿径向错开——和玻璃色散是同一套语言）
     · 硬边切片（高强度时才出现，制造「换页」的断裂感）
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

      float hash11(float p) {
        p = fract(p * 0.1031);
        p *= p + 33.33;
        p *= p + p;
        return fract(p);
      }

      void main() {
        float a = clamp(uAmt, 0.0, 1.0);
        vec2 uv = vUv;
        vec2 c = uv - 0.5;
        float r2 = dot(c, c);

        // 硬边切片：把画面切成几条横带，各带独立水平位移
        float bands = 9.0;
        float bi = floor(uv.y * bands);
        float slice = (hash11(bi + uSeed) - 0.5) * a * a * 0.055;
        uv.x += slice;

        // 竖向剪切：中间跟手，两侧滞后
        uv.y += uDir * a * 0.030 * sin(uv.x * 3.14159265);

        // 桶形 warp
        vec2 warp = c * (r2 * a * 0.26);
        uv -= warp;

        // 色度分离：沿径向，越靠边越明显
        float ca = a * (0.0035 + r2 * 0.028);
        vec2 dirv = normalize(c + 1e-5);
        vec2 off = dirv * ca;

        vec3 col;
        col.r = texture2D(uTex, clamp(uv + off, vec2(0.0), vec2(1.0))).r;
        col.g = texture2D(uTex, clamp(uv,       vec2(0.0), vec2(1.0))).g;
        col.b = texture2D(uTex, clamp(uv - off, vec2(0.0), vec2(1.0))).b;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  return { material, uniforms };
}
