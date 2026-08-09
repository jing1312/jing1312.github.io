/*
 * character-stage.js — 首页的 2.5D 人物舞台。
 * 人物图片在 WebGL 中做近白背景透明化，再与真正的 3D 几何体分层组合。
 */

import * as THREE from "three";

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 texel = texture2D(uMap, vUv);
    float distanceFromWhite = length(vec3(1.0) - texel.rgb);
    float chroma = max(texel.r, max(texel.g, texel.b)) - min(texel.r, min(texel.g, texel.b));
    float alpha = smoothstep(0.045, 0.18, distanceFromWhite + chroma * 0.32);
    alpha *= texel.a * uOpacity;
    if (alpha < 0.015) discard;
    gl_FragColor = vec4(texel.rgb, alpha);
  }
`;

function pastelMaterial(color, roughness = .28) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0,
    clearcoat: .8,
    clearcoatRoughness: .24,
    transparent: true,
  });
}

export function createCharacterStage(canvas, { reducedMotion = false, onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 20);
  camera.position.set(0, 0, 5);

  const stage = new THREE.Group();
  scene.add(stage);

  const ambient = new THREE.HemisphereLight(0xffffff, 0xb8a9df, 2.4);
  const key = new THREE.DirectionalLight(0xfff1df, 3.6);
  key.position.set(3, 4, 5);
  const fill = new THREE.DirectionalLight(0xb8dcff, 1.8);
  fill.position.set(-4, 1, 3);
  scene.add(ambient, key, fill);

  const imageUniforms = { uMap: { value: null }, uOpacity: { value: 0 } };
  const imageMaterial = new THREE.ShaderMaterial({
    uniforms: imageUniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
  const portrait = new THREE.Mesh(new THREE.PlaneGeometry(2.72, 2.72), imageMaterial);
  portrait.position.set(.08, -.04, .08);
  portrait.renderOrder = 3;
  stage.add(portrait);

  const decorations = [];
  function addDecoration(geometry, material, position, scale = 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.setScalar(scale);
    mesh.userData.baseY = position[1];
    mesh.userData.phase = decorations.length * 1.37;
    stage.add(mesh);
    decorations.push(mesh);
    return mesh;
  }

  addDecoration(new THREE.OctahedronGeometry(.18, 1), pastelMaterial(0xffcf68), [-1.12, .98, .42], 1.05);
  addDecoration(new THREE.IcosahedronGeometry(.17, 2), pastelMaterial(0xf08bad), [1.08, .78, .32], .94);
  addDecoration(new THREE.OctahedronGeometry(.15, 1), pastelMaterial(0xab91ed), [-1.28, -.52, .2], .88);
  addDecoration(new THREE.TorusGeometry(.21, .065, 18, 48), pastelMaterial(0x82b9ee, .2), [1.2, -.66, .28], .92).rotation.set(.8, .2, -.45);

  const platform = new THREE.Mesh(
    new THREE.CircleGeometry(1.16, 64),
    new THREE.MeshBasicMaterial({ color: 0x657398, transparent: true, opacity: .11, depthWrite: false })
  );
  platform.rotation.x = -Math.PI / 2;
  platform.position.set(.08, -1.28, -.22);
  platform.scale.y = .32;
  stage.add(platform);

  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let visibility = 0;
  let ready = false;
  let last = performance.now();

  const texture = new THREE.TextureLoader().load(
    "assets/character-hero.png",
    (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      imageUniforms.uMap.value = loaded;
      ready = true;
      onReady?.();
    }
  );
  imageUniforms.uMap.value = texture;

  function onPointerMove(event) {
    pointerTarget.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  function resize() {
    const width = Math.max(window.innerWidth, 1);
    const height = Math.max(window.innerHeight, 1);
    const dprLimit = width < 760 ? 1.25 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprLimit));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    const homeVisible = (window.__homepage?.view || "home") === "home";
    const targetVisibility = homeVisible && ready ? 1 : 0;
    visibility += (targetVisibility - visibility) * (reducedMotion ? 1 : Math.min(1, dt * 7));
    imageUniforms.uOpacity.value = visibility;
    for (const mesh of decorations) mesh.material.opacity = visibility;
    platform.material.opacity = .11 * visibility;
    stage.visible = visibility > .01;

    const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    const visibleHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
    const visibleWidth = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)) * aspect;
    const art = document.querySelector(".home-art");
    const artRect = art?.getBoundingClientRect();
    const centerX = artRect ? artRect.left + artRect.width * .5 : window.innerWidth * .72;
    const centerY = artRect ? artRect.top + artRect.height * .49 : window.innerHeight * .48;
    const targetX = ((centerX / window.innerWidth) * 2 - 1) * visibleWidth * .5;
    const targetY = -((centerY / window.innerHeight) * 2 - 1) * visibleHeight * .5;

    // 舞台尺寸来自右侧容器，避免人物在矮屏和窄屏上压住标题。
    const widthScale = artRect ? (artRect.width * .82 / window.innerWidth) * visibleWidth / 3.05 : .58;
    const heightScale = artRect ? (artRect.height * .86 / window.innerHeight) * visibleHeight / 2.9 : .58;
    const targetScale = THREE.MathUtils.clamp(Math.min(widthScale, heightScale), .36, .68);
    stage.position.x += (targetX - stage.position.x) * Math.min(1, dt * 6);
    stage.position.y += (targetY - stage.position.y) * Math.min(1, dt * 6);
    stage.scale.x += (targetScale - stage.scale.x) * Math.min(1, dt * 6);
    stage.scale.y = stage.scale.z = stage.scale.x;

    if (!reducedMotion) {
      pointer.lerp(pointerTarget, Math.min(1, dt * 5));
      stage.rotation.y += (pointer.x * .10 - stage.rotation.y) * Math.min(1, dt * 4);
      stage.rotation.x += (-pointer.y * .055 - stage.rotation.x) * Math.min(1, dt * 4);
      portrait.position.y = -.04 + Math.sin(now * .00072) * .035;
      decorations.forEach((mesh, index) => {
        mesh.position.y = mesh.userData.baseY + Math.sin(now * .0011 + mesh.userData.phase) * .075;
        mesh.rotation.x += dt * (.25 + index * .035);
        mesh.rotation.y += dt * (.34 + index * .045);
      });
    }

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  return {
    renderer,
    get ready() { return ready; },
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
      texture.dispose();
      portrait.geometry.dispose();
      imageMaterial.dispose();
      decorations.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose(); });
      platform.geometry.dispose(); platform.material.dispose();
      renderer.dispose();
    },
  };
}
