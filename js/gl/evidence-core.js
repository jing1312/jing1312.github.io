import * as THREE from "three";
import { clamp, damp, seededRandom } from "../util/anim.js";

function makeGraphPositions(count) {
  const random = seededRandom(0x45a1c9);
  const positions = [];
  const columns = 6;
  const rows = Math.ceil(count / columns);
  for (let i = 0; i < count; i += 1) {
    const column = Math.floor(i / rows);
    const row = i % rows;
    positions.push(new THREE.Vector3(
      -1.5 + column * .6 + (random() - .5) * .08,
      (row - (rows - 1) / 2) * .34 + (random() - .5) * .1,
      (random() - .5) * .62,
    ));
  }
  return positions;
}

function makeGraphEdges(count) {
  const columns = 6;
  const rows = Math.ceil(count / columns);
  const edges = [];
  for (let column = 0; column < columns - 1; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const a = column * rows + row;
      const b = (column + 1) * rows + row;
      if (a < count && b < count) edges.push([a, b]);
    }
  }
  const cross = [[0,8],[3,11],[7,16],[10,19],[14,22],[17,25],[21,30],[24,33],[28,36],[31,40]];
  for (const [a, b] of cross) if (a < count && b < count) edges.push([a, b]);
  return edges;
}

function moleculePositions(data) {
  return data.atoms.map((atom) => new THREE.Vector3(atom.x, atom.z, -atom.y).multiplyScalar(1.78));
}

function orbit(radius, color, opacity) {
  const points = [];
  for (let i = 0; i < 160; i += 1) {
    const angle = (i / 160) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineLoop(geometry, material);
}

export function createEvidenceCore(canvas, molecule, {
  reduced = false,
  qa = false,
  onContextLost = null,
} = {}) {
  const stage = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
  camera.position.set(0, .08, 6.3);

  const group = new THREE.Group();
  group.rotation.set(-.16, -.24, -.08);
  scene.add(group);

  const ink = new THREE.Color("#111516");
  const accent = new THREE.Color("#0BBFAE");
  const accentDark = new THREE.Color("#067F75");
  const graph = makeGraphPositions(molecule.atoms.length);
  const mol = moleculePositions(molecule);
  const graphEdges = makeGraphEdges(molecule.atoms.length);
  const molEdges = molecule.bonds.map((bond) => [bond[0], bond[1]]);
  const edgeCount = Math.min(graphEdges.length, molEdges.length);

  const nodeGeometry = new THREE.SphereGeometry(.055, 14, 10);
  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: .38,
    metalness: .12,
    vertexColors: true,
  });
  const nodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, graph.length);
  nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  nodes.frustumCulled = false;
  group.add(nodes);

  const linePositions = new Float32Array(edgeCount * 2 * 3);
  const lineGeometry = new THREE.BufferGeometry();
  const lineAttribute = new THREE.BufferAttribute(linePositions, 3);
  lineAttribute.setUsage(THREE.DynamicDrawUsage);
  lineGeometry.setAttribute("position", lineAttribute);
  const lines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({
    color: ink,
    transparent: true,
    opacity: .48,
  }));
  group.add(lines);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.88, 2),
    new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: .045 }),
  );
  group.add(shell);

  const orbitA = orbit(1.95, ink, .16);
  orbitA.rotation.set(1.15, .1, .2);
  group.add(orbitA);
  const orbitB = orbit(1.58, accentDark, .25);
  orbitB.rotation.set(.4, 1.1, -.35);
  group.add(orbitB);
  const orbitC = orbit(2.12, ink, .09);
  orbitC.rotation.set(.2, -.55, 1.1);
  group.add(orbitC);

  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(.095, 18, 12),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: .45, roughness: .2 }),
  );
  group.add(pulse);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xa7b5b2, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(3, 4, 6);
  scene.add(key);
  const rim = new THREE.PointLight(accent, 5.5, 10, 2);
  rim.position.set(-2.5, 1.2, 3);
  scene.add(rim);

  const dummy = new THREE.Object3D();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const color = new THREE.Color();
  let morph = reduced ? .62 : 0;
  let morphTarget = morph;
  let pointerX = 0;
  let pointerY = 0;
  let rotX = group.rotation.x;
  let rotY = group.rotation.y;
  let visible = true;
  let rendering = false;
  let raf = 0;
  let previous = performance.now();
  let time = qa || reduced ? 4.0 : 0;

  function writeGeometry() {
    for (let i = 0; i < graph.length; i += 1) {
      pA.copy(graph[i]).lerp(mol[i], morph);
      dummy.position.copy(pA);
      const atomScale = molecule.atoms[i].el === "H" ? .68 : molecule.atoms[i].el === "O" ? 1.35 : 1;
      dummy.scale.setScalar(1 + (atomScale - 1) * morph);
      dummy.updateMatrix();
      nodes.setMatrixAt(i, dummy.matrix);

      const graphActive = (i % 9 === 4) ? 1 : 0;
      const moleculeActive = molecule.atoms[i].el === "O" ? 1 : 0;
      const active = graphActive + (moleculeActive - graphActive) * morph;
      color.copy(ink).lerp(accent, active);
      nodes.setColorAt(i, color);
    }
    nodes.instanceMatrix.needsUpdate = true;
    if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;

    for (let i = 0; i < edgeCount; i += 1) {
      const [ga, gb] = graphEdges[i];
      const [ma, mb] = molEdges[i];
      pA.copy(graph[ga]).lerp(mol[ma], morph);
      pB.copy(graph[gb]).lerp(mol[mb], morph);
      linePositions.set([pA.x, pA.y, pA.z, pB.x, pB.y, pB.z], i * 6);
    }
    lineAttribute.needsUpdate = true;
  }

  function updateMorphTarget() {
    if (reduced) { morphTarget = .62; return; }
    const hero = document.getElementById("home");
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    morphTarget = clamp(-rect.top / Math.max(rect.height * .72, 1), 0, 1);
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const mobile = rect.width < 560;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5));
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.position.z = mobile ? 7.55 : 7.15;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    if (!visible) { rendering = false; raf = 0; return; }
    rendering = true;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(Math.max((now - previous) / 1000, 1 / 240), .08);
    previous = now;
    if (!qa && !reduced) time += dt;
    updateMorphTarget();
    morph = qa || reduced ? morphTarget : damp(morph, morphTarget, .14, dt);

    const baseX = -.16 + pointerY * .08;
    const baseY = -.24 + pointerX * .11;
    rotX = reduced ? -.16 : damp(rotX, baseX, .15, dt);
    rotY = reduced ? -.24 : damp(rotY, baseY, .15, dt);
    group.rotation.x = rotX;
    group.rotation.y = rotY + (qa || reduced ? 0 : Math.sin(time * .22) * .045);
    group.rotation.z = -.08 + (qa || reduced ? 0 : time * .018);
    orbitA.rotation.z = .2 + (qa || reduced ? 0 : time * .045);
    orbitB.rotation.z = -.35 - (qa || reduced ? 0 : time * .035);
    shell.rotation.y = qa || reduced ? .35 : time * .025;

    writeGeometry();
    const edge = Math.floor((time * .62) % edgeCount);
    const edgePhase = (time * .62) % 1;
    const [ga, gb] = graphEdges[edge];
    const [ma, mb] = molEdges[edge];
    pA.copy(graph[ga]).lerp(mol[ma], morph);
    pB.copy(graph[gb]).lerp(mol[mb], morph);
    pulse.position.copy(pA).lerp(pB, edgePhase);
    pulse.scale.setScalar(.82 + Math.sin(time * 2.4) * .12);

    renderer.render(scene, camera);
  }

  function start() {
    if (raf || !visible) return;
    previous = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }, { threshold: .01 });
  observer.observe(stage);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  window.addEventListener("scroll", updateMorphTarget, { passive: true });
  stage.addEventListener("pointermove", (event) => {
    if (reduced || event.pointerType === "touch") return;
    const rect = stage.getBoundingClientRect();
    pointerX = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
    pointerY = clamp((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;
  }, { passive: true });
  stage.addEventListener("pointerleave", () => { pointerX = 0; pointerY = 0; }, { passive: true });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    rendering = false;
    onContextLost?.();
  });

  resize();
  updateMorphTarget();
  writeGeometry();
  start();

  return {
    get morph() { return morph; },
    get rendering() { return rendering; },
    resize,
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", updateMorphTarget);
      renderer.dispose();
    },
  };
}
