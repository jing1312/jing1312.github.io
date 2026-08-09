/*
 * THESIS: 头像不是一张放在卡片里的图片，而是一枚会呼吸、会跟手的桌面徽章。
 * OWN-WORLD: 粉白软陶、半透明圆盘、珊瑚粉动作色和少量薄荷/药丸黄。
 * STORY: 先认出 jingjing，再看到药学、代码和课程工具都在同一个桌面上。
 * FIRST VIEWPORT: 左侧是真人语气的介绍，右侧 Kitty 占据独立圆形舞台，下沿露出近期内容。
 * FORM: 用户指定的圆形头像舞台；Three.js 多层圆盘与软陶小物替代静态 CSS 拼贴。
 */

import * as THREE from "three";

export const KITTY_BOB_AMPLITUDE = .14;

const PORTRAIT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PORTRAIT_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 point = vUv - .5;
    float radius = length(point);
    float mask = 1.0 - smoothstep(.475, .5, radius);
    vec4 texel = texture2D(uMap, vUv);
    if (mask < .01) discard;
    gl_FragColor = vec4(texel.rgb, texel.a * mask * uOpacity);
  }
`;

function clay(color, options = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? .32,
    metalness: 0,
    clearcoat: options.clearcoat ?? .72,
    clearcoatRoughness: .28,
    transparent: true,
    opacity: options.opacity ?? 1,
  });
  material.userData.baseOpacity = material.opacity;
  return material;
}

function createCapsule() {
  const group = new THREE.Group();
  const pink = clay(0xf06f98, { roughness: .2 });
  const yellow = clay(0xffd16b, { roughness: .24 });
  const top = new THREE.Mesh(new THREE.SphereGeometry(.14, 24, 16), pink);
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(.14, 24, 16), yellow);
  top.scale.y = bottom.scale.y = .78;
  top.position.y = .105;
  bottom.position.y = -.105;
  group.add(top, bottom);
  group.rotation.z = -.72;
  return group;
}

function createRobot() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.32, .25, .22), clay(0x8a83d8));
  const face = new THREE.Mesh(new THREE.BoxGeometry(.24, .13, .025), clay(0xeef5ff, { roughness: .45 }));
  face.position.set(0, .015, .122);
  const eyeMaterial = clay(0x293451, { roughness: .5 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(.025, 12, 8), eyeMaterial);
  const rightEye = leftEye.clone();
  leftEye.position.set(-.055, .02, .145);
  rightEye.position.set(.055, .02, .145);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .15, 12), clay(0xf06f98));
  antenna.position.y = .19;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.035, 14, 10), clay(0xffd16b));
  tip.position.y = .28;
  group.add(body, face, leftEye, rightEye, antenna, tip);
  return group;
}

function createFlower() {
  const group = new THREE.Group();
  const petalMaterial = clay(0xff7da5, { roughness: .28 });
  for (let index = 0; index < 5; index += 1) {
    const angle = index / 5 * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(.105, 18, 12), petalMaterial);
    petal.scale.set(.72, 1.18, .45);
    petal.position.set(Math.cos(angle) * .13, Math.sin(angle) * .13, 0);
    petal.rotation.z = angle - Math.PI / 2;
    group.add(petal);
  }
  group.add(new THREE.Mesh(new THREE.SphereGeometry(.075, 18, 12), clay(0xffd36f)));
  return group;
}

function createTube() {
  const group = new THREE.Group();
  const glass = clay(0xdff7ff, { opacity: .68, roughness: .1, clearcoat: 1 });
  const liquid = clay(0x77d7ad, { opacity: .9 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .34, 24, 1, true), glass);
  const liquidBody = new THREE.Mesh(new THREE.CylinderGeometry(.056, .056, .16, 20), liquid);
  liquidBody.position.y = -.075;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.078, .014, 10, 30), clay(0x70b6ed));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = .17;
  group.add(tube, liquidBody, rim);
  group.rotation.z = -.55;
  return group;
}

export function createCharacterStage(canvas, { reducedMotion = false, onReady, onError } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.dataset.engine = `three.js r${THREE.REVISION}`;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 30);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a9de, 2.8));
  const key = new THREE.DirectionalLight(0xfff2f6, 4.2);
  key.position.set(3.4, 4, 5);
  const rimLight = new THREE.DirectionalLight(0xaee8ff, 2.2);
  rimLight.position.set(-4, 1, 3);
  scene.add(key, rimLight);

  const stage = new THREE.Group();
  const core = new THREE.Group();
  const kittyRig = new THREE.Group();
  const rings = new THREE.Group();
  stage.add(core);
  core.add(rings, kittyRig);
  scene.add(stage);

  const backPlate = new THREE.Mesh(
    new THREE.CircleGeometry(1.52, 72),
    clay(0xfefcff, { opacity: .88, roughness: .5 })
  );
  backPlate.position.z = -.34;
  core.add(backPlate);

  const innerPlate = new THREE.Mesh(
    new THREE.CircleGeometry(1.17, 72),
    clay(0xffe8ef, { opacity: .54, roughness: .42 })
  );
  innerPlate.position.z = -.2;
  core.add(innerPlate);

  const ringMaterials = [
    clay(0xf7a8be, { opacity: .72, roughness: .18 }),
    clay(0xffffff, { opacity: .92, roughness: .2 }),
    clay(0xd7c7f6, { opacity: .58, roughness: .2 }),
  ];
  const ringSpecs = [[1.22, .036, -.09], [1.34, .025, -.17], [1.46, .018, -.25]];
  ringSpecs.forEach(([radius, tube, z], index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 18, 96), ringMaterials[index]);
    ring.position.z = z;
    ring.rotation.set(index * .05, index * -.08, 0);
    rings.add(ring);
  });

  const portraitUniforms = { uMap: { value: null }, uOpacity: { value: 0 } };
  const portraitMaterial = new THREE.ShaderMaterial({
    uniforms: portraitUniforms,
    vertexShader: PORTRAIT_VERTEX,
    fragmentShader: PORTRAIT_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  const portrait = new THREE.Mesh(new THREE.PlaneGeometry(2.08, 2.08), portraitMaterial);
  portrait.position.z = .08;
  kittyRig.add(portrait);

  const props = [];
  function addProp(object, position, scale, phase) {
    object.position.set(...position);
    object.scale.setScalar(scale);
    object.userData.base = new THREE.Vector3(...position);
    object.userData.phase = phase;
    object.userData.spin = .18 + phase * .035;
    stage.add(object);
    props.push(object);
  }

  addProp(createFlower(), [-1.42, 1.06, .24], .82, .2);
  addProp(createCapsule(), [1.38, 1.12, .38], 1.16, 1.3);
  addProp(createTube(), [-1.55, -.8, .3], 1.05, 2.4);
  addProp(createRobot(), [1.34, -.92, .42], .9, 3.5);
  addProp(new THREE.Mesh(new THREE.OctahedronGeometry(.105, 1), clay(0xffca55)), [1.58, .16, .5], 1, 4.2);
  addProp(new THREE.Mesh(new THREE.OctahedronGeometry(.075, 1), clay(0xf2a2dc)), [-1.18, .2, .42], 1, 5.1);

  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let ready = false;
  let visibility = 0;
  let hopStartedAt = -1;
  let previous = performance.now();

  const texture = new THREE.TextureLoader().load(
    "assets/hello-kitty-avatar.png",
    (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      portraitUniforms.uMap.value = loaded;
      ready = true;
      onReady?.();
    },
    undefined,
    (error) => onError?.(error)
  );
  portraitUniforms.uMap.value = texture;

  function handlePointer(event) {
    pointerTarget.set((event.clientX / innerWidth) * 2 - 1, -((event.clientY / innerHeight) * 2 - 1));
  }
  function handleHop() {
    if (!reducedMotion) hopStartedAt = performance.now();
  }
  addEventListener("pointermove", handlePointer, { passive: true });
  addEventListener("kitty-hop", handleHop);

  function resize() {
    const width = Math.max(innerWidth, 1);
    const height = Math.max(innerHeight, 1);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 760 ? 1.3 : 1.8));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize, { passive: true });

  function setMaterialVisibility(amount) {
    portraitUniforms.uOpacity.value = amount;
    stage.traverse((object) => {
      if (!object.material || object.material === portraitMaterial) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        const base = material.userData.baseOpacity ?? 1;
        material.opacity = base * amount;
      }
    });
  }

  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .05);
    previous = now;
    const homeVisible = (window.__homepage?.view || "home") === "home";
    const targetVisibility = homeVisible && ready ? 1 : 0;
    visibility += (targetVisibility - visibility) * (reducedMotion ? 1 : Math.min(1, dt * 8));
    setMaterialVisibility(visibility);
    stage.visible = visibility > .01;

    const area = document.querySelector(".hero-stage")?.getBoundingClientRect();
    const viewportWidth = Math.max(innerWidth, 1);
    const viewportHeight = Math.max(innerHeight, 1);
    const aspect = viewportWidth / viewportHeight;
    const visibleHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
    const visibleWidth = visibleHeight * aspect;
    const centerX = area ? area.left + area.width * .5 : viewportWidth * .72;
    const centerY = area ? area.top + area.height * .48 : viewportHeight * .5;
    const targetX = ((centerX / viewportWidth) * 2 - 1) * visibleWidth * .5;
    const targetY = -((centerY / viewportHeight) * 2 - 1) * visibleHeight * .5;
    const widthScale = area ? (area.width * .9 / viewportWidth) * visibleWidth / 3.55 : .56;
    const heightScale = area ? (area.height * .9 / viewportHeight) * visibleHeight / 3.45 : .56;
    const targetScale = THREE.MathUtils.clamp(Math.min(widthScale, heightScale), .38, .76);

    stage.position.x += (targetX - stage.position.x) * Math.min(1, dt * 7);
    stage.position.y += (targetY - stage.position.y) * Math.min(1, dt * 7);
    stage.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, dt * 7));

    if (!reducedMotion) {
      pointer.lerp(pointerTarget, Math.min(1, dt * 5));
      stage.rotation.y += (pointer.x * .16 - stage.rotation.y) * Math.min(1, dt * 4);
      stage.rotation.x += (-pointer.y * .1 - stage.rotation.x) * Math.min(1, dt * 4);

      const naturalBob = Math.sin(now * .00115) * KITTY_BOB_AMPLITUDE;
      const hopAge = hopStartedAt < 0 ? 2 : (now - hopStartedAt) / 760;
      const hop = hopAge < 1 ? Math.sin(hopAge * Math.PI) * .46 : 0;
      kittyRig.position.y = naturalBob + hop;
      kittyRig.rotation.z = Math.sin(now * .0008) * .035 + pointer.x * .025;
      const hopScale = 1 + (hopAge < 1 ? Math.sin(hopAge * Math.PI) * .08 : 0);
      kittyRig.scale.setScalar(hopScale);

      rings.rotation.z += dt * .06;
      rings.rotation.y = Math.sin(now * .00042) * .08 + pointer.x * .05;
      props.forEach((object) => {
        object.position.y = object.userData.base.y + Math.sin(now * .0012 + object.userData.phase) * .13;
        object.position.x = object.userData.base.x + Math.cos(now * .00072 + object.userData.phase) * .035;
        object.rotation.y += dt * object.userData.spin;
        object.rotation.x += dt * object.userData.spin * .58;
      });
    }

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  return {
    renderer,
    get ready() { return ready; },
    hop: handleHop,
    dispose() {
      renderer.setAnimationLoop(null);
      removeEventListener("pointermove", handlePointer);
      removeEventListener("kitty-hop", handleHop);
      removeEventListener("resize", resize);
      texture.dispose();
      stage.traverse((object) => {
        object.geometry?.dispose?.();
        if (object.material && object.material !== portraitMaterial) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      portraitMaterial.dispose();
      renderer.dispose();
    },
  };
}
