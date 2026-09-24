/**
 * BrandMotion — "Fractured Core" hero scene.
 *
 * A faceted obsidian core, split into shards that breathe apart and leak light
 * from a glowing heart, hovering over a slow, contour-lined night sea.
 *
 * Framework-free: works in plain HTML (via an import map) and inside React /
 * Next.js (import it and call `createBrandMotionScene(canvas)` in an effect).
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export const PALETTE = {
  skyTop: "#040914",
  skyMid: "#0f2247",
  horizon: "#4a6fae",
  sea: "#050d20",
  seaLift: "#1b3566",
  glow: "#dce8ff",
  shard: "#060b16",
};

/* ── Small deterministic helpers ─────────────────────────────────────────── */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap smooth 3D field used to sculpt the core's silhouette.
function field(x, y, z) {
  return (
    Math.sin(x * 2.1 + 1.3) * Math.sin(y * 1.7 + 0.4) * Math.sin(z * 2.3 + 2.2) * 0.6 +
    Math.sin(x * 4.3 - y * 3.1 + 0.7) * 0.25 +
    Math.sin(z * 3.7 + x * 1.9 - 1.1) * 0.15
  );
}

/* ── Fractured core geometry ─────────────────────────────────────────────── */
function buildShards({ seeds = 13, detail = 2, inner = 0.5, seed = 7 } = {}) {
  const rand = rng(seed);
  const base = mergeVertices(new THREE.IcosahedronGeometry(1, detail));
  const pos = base.getAttribute("position");
  const idx = base.getIndex();

  // Sculpt every shared vertex once, so neighbouring shards stay watertight.
  const outer = [];
  const dirs = [];
  for (let i = 0; i < pos.count; i++) {
    const d = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    const r = 1 + field(d.x, d.y, d.z) * 0.09;
    dirs.push(d);
    outer.push(d.clone().multiply(new THREE.Vector3(r * 0.96, r * 1.08, r * 0.96)));
  }

  // Voronoi cells on the sphere: jittered Fibonacci seeds.
  const cells = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < seeds; i++) {
    const y = 1 - ((i + 0.5) / seeds) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = ga * i + rand() * 0.6;
    cells.push(
      new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr)
        .add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.25))
        .normalize()
    );
  }

  const triCount = idx.count / 3;
  const owner = new Int32Array(triCount);
  const c = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.add(dirs[idx.getX(t * 3 + k)]);
    c.normalize();
    let best = 0;
    let bd = -Infinity;
    cells.forEach((s, i) => {
      const dd = s.dot(c);
      if (dd > bd) (bd = dd), (best = i);
    });
    owner[t] = best;
  }

  // Edge → triangles map, to find cell borders.
  const edgeOwners = new Map();
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const a = idx.getX(t * 3 + k);
      const b = idx.getX(t * 3 + ((k + 1) % 3));
      const kk = key(a, b);
      const list = edgeOwners.get(kk) || [];
      list.push(owner[t]);
      edgeOwners.set(kk, list);
    }
  }

  const shards = [];
  for (let s = 0; s < seeds; s++) {
    const faceP = [];
    const wallP = [];
    const wallC = [];
    const centre = new THREE.Vector3();
    let n = 0;

    for (let t = 0; t < triCount; t++) {
      if (owner[t] !== s) continue;
      const ids = [idx.getX(t * 3), idx.getX(t * 3 + 1), idx.getX(t * 3 + 2)];
      ids.forEach((i) => {
        faceP.push(outer[i].x, outer[i].y, outer[i].z);
        centre.add(outer[i]);
        n++;
      });
      for (let k = 0; k < 3; k++) {
        const a = ids[k];
        const b = ids[(k + 1) % 3];
        const list = edgeOwners.get(key(a, b));
        if (list.every((o) => o === s)) continue;
        // Border wall: outer edge → inner edge. Brighter toward the core.
        const oa = outer[a], ob = outer[b];
        const ia = dirs[a].clone().multiplyScalar(inner);
        const ib = dirs[b].clone().multiplyScalar(inner);
        wallP.push(oa.x, oa.y, oa.z, ib.x, ib.y, ib.z, ob.x, ob.y, ob.z);
        wallP.push(oa.x, oa.y, oa.z, ia.x, ia.y, ia.z, ib.x, ib.y, ib.z);
        wallC.push(0.08, 1.9, 0.08, 0.08, 1.9, 1.9);
      }
    }

    centre.divideScalar(n);
    const faces = new THREE.BufferGeometry();
    faces.setAttribute("position", new THREE.Float32BufferAttribute(faceP, 3));
    faces.computeVertexNormals();

    const walls = new THREE.BufferGeometry();
    walls.setAttribute("position", new THREE.Float32BufferAttribute(wallP, 3));
    walls.setAttribute("heat", new THREE.Float32BufferAttribute(wallC, 1));

    shards.push({ faces, walls, dir: centre.clone().normalize(), phase: rand() * Math.PI * 2 });
  }
  base.dispose();
  return shards;
}

/* ── Shaders ─────────────────────────────────────────────────────────────── */
const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_COMMON = /* glsl */ `
  uniform vec3 uTop, uMid, uHorizon, uSea;
  vec3 skyColor(vec3 d) {
    float y = d.y;
    vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.22, y));
    c = mix(c, uTop, smoothstep(0.18, 0.85, y));
    c += uHorizon * 0.22 * exp(-abs(y) * 26.0);          // haze band
    c = mix(c, uSea, smoothstep(0.0, -0.08, y));
    return c;
  }
`;

const SKY_FRAG = /* glsl */ `
  ${SKY_COMMON}
  varying vec3 vDir;
  void main() {
    gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0);
  }
`;

const SEA_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float height(vec2 p) {
    float t = uTime;
    float h = 0.0;
    h += 0.34 * sin(dot(p, vec2(0.28, 0.12)) + t * 0.45);
    h += 0.18 * sin(dot(p, vec2(-0.16, 0.42)) + t * 0.62);
    h += 0.07 * sin(dot(p, vec2(0.71, -0.55)) + t * 0.95);
    vec2 q = p * 0.22 + vec2(t * 0.05, -t * 0.03);
    h += (noise(q) + 0.5 * noise(q * 2.1 + 3.7) + 0.25 * noise(q * 4.3 - 1.3)) * 0.42;
    return h;
  }
  void main() {
    vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
    float e = 0.12;
    float h = height(p.xz);
    float hx = height(p.xz + vec2(e, 0.0));
    float hz = height(p.xz + vec2(0.0, e));
    vNormal = normalize(vec3(h - hx, e, h - hz));
    p.y += h;
    vH = h;
    vWorld = p;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const SEA_FRAG = /* glsl */ `
  ${SKY_COMMON}
  uniform vec3 uLift, uGlow, uCore;
  uniform float uCorePulse;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float dist = length(vWorld.xz - cameraPosition.xz);

    // Base body + fresnel sky reflection.
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    vec3 col = mix(uSea, uLift, smoothstep(-0.4, 0.9, vH) * 0.55);
    col = mix(col, skyColor(R) * 0.8, clamp(fres * 0.55, 0.0, 1.0));

    // Moon-like sheen from the horizon behind the core.
    vec3 L = normalize(vec3(0.0, 0.35, -1.0));
    float spec = pow(max(dot(R, L), 0.0), 60.0);
    col += uHorizon * spec * 0.9;

    // Topographic contour lines — the sea reads as a data surface.
    float k = vH * 7.0;
    float dk = min(fract(k), 1.0 - fract(k));
    float line = 1.0 - smoothstep(0.0, max(fwidth(k), 1e-4) * 1.2, dk);
    col += uGlow * line * 0.07 * exp(-dist * 0.08);

    // Pool of light cast by the core onto the water below it.
    float d = length(vWorld.xz - uCore.xz);
    float pool = exp(-d * d * 1.4) * uCorePulse;
    col += uGlow * pool * (0.06 + fres * 0.35);

    // Distance fog into the horizon haze.
    float fog = 1.0 - exp(-dist * dist * 0.0009);
    col = mix(col, skyColor(normalize(vec3(0.0, 0.004, -1.0))), fog);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const WALL_VERT = /* glsl */ `
  attribute float heat;
  varying float vHeat;
  void main() {
    vHeat = heat;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const WALL_FRAG = /* glsl */ `
  uniform vec3 uGlow;
  uniform float uIntensity;
  varying float vHeat;
  void main() { gl_FragColor = vec4(uGlow * vHeat * uIntensity, 1.0); }
`;

/* ── Scene ───────────────────────────────────────────────────────────────── */
/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ reducedMotion?: boolean, interactive?: boolean }} [opts]
 * @returns {{ dispose: () => void }}
 */
export function createBrandMotionScene(canvas, opts = {}) {
  const { reducedMotion = false, interactive = true } = opts;
  const col = (h) => new THREE.Color(h);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);
  camera.position.set(0, 1.55, 8.2);
  const lookAt = new THREE.Vector3(0, 1.35, 0);
  camera.lookAt(lookAt);
  camera.updateMatrixWorld();

  const skyUniforms = {
    uTop: { value: col(PALETTE.skyTop) },
    uMid: { value: col(PALETTE.skyMid) },
    uHorizon: { value: col(PALETTE.horizon) },
    uSea: { value: col(PALETTE.sea) },
  };

  // Sky dome.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 48, 24),
    new THREE.ShaderMaterial({ uniforms: skyUniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false })
  );
  scene.add(sky);

  // Env map from the sky, so the shards pick up the blue gradient in their facets.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.clone());
  const env = pmrem.fromScene(envScene, 0.02, 0.1, 500);
  scene.environment = env.texture;

  // Sea.
  const seaUniforms = {
    ...skyUniforms,
    uTime: { value: 0 },
    uLift: { value: col(PALETTE.seaLift) },
    uGlow: { value: col(PALETTE.glow) },
    uCore: { value: new THREE.Vector3() },
    uCorePulse: { value: 1 },
  };
  const seaGeo = new THREE.PlaneGeometry(160, 160, 280, 280);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(
    seaGeo,
    new THREE.ShaderMaterial({ uniforms: seaUniforms, vertexShader: SEA_VERT, fragmentShader: SEA_FRAG, extensions: { derivatives: true } })
  );
  sea.position.set(0, -0.35, -40);
  scene.add(sea);

  // Lights for the shard faces.
  scene.add(new THREE.HemisphereLight(0x5f82c4, 0x02050c, 0.2));
  const rim = new THREE.DirectionalLight(0xbfd4ff, 2.2);
  rim.position.set(-2, 3, -6);
  scene.add(rim);
  const key = new THREE.DirectionalLight(0x6f8fd0, 0.9);
  key.position.set(4, 2, 5);
  scene.add(key);

  // Fractured core.
  const core = new THREE.Group();
  core.position.copy(lookAt);
  core.scale.setScalar(0.82);
  scene.add(core);

  const faceMat = new THREE.MeshPhysicalMaterial({
    color: col(PALETTE.shard),
    roughness: 0.42,
    metalness: 0.15,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    flatShading: true,
    envMapIntensity: 0.45,
  });
  const wallUniforms = { uGlow: { value: col(PALETTE.glow) }, uIntensity: { value: 1 } };
  const wallMat = new THREE.ShaderMaterial({ uniforms: wallUniforms, vertexShader: WALL_VERT, fragmentShader: WALL_FRAG, side: THREE.DoubleSide, toneMapped: false });
  const lineMat = new THREE.LineBasicMaterial({ color: col(PALETTE.glow), transparent: true, opacity: 0.12, depthWrite: false });

  const shards = buildShards().map((s) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(s.faces, faceMat));
    g.add(new THREE.Mesh(s.walls, wallMat));
    const edges = new THREE.EdgesGeometry(s.faces, 1);
    g.add(new THREE.LineSegments(edges, lineMat));
    core.add(g);
    return { ...s, group: g, edges };
  });

  const heart = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.48, 3),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 2.2, 3.0), toneMapped: false })
  );
  core.add(heart);

  // Drifting motes.
  const MOTES = 420;
  const moteP = new Float32Array(MOTES * 3);
  const rand = rng(99);
  for (let i = 0; i < MOTES; i++) {
    moteP[i * 3] = (rand() - 0.5) * 22;
    moteP[i * 3 + 1] = rand() * 6 - 0.2;
    moteP[i * 3 + 2] = -rand() * 18 + 4;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(moteP, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({ color: col(PALETTE.glow), size: 0.028, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  scene.add(motes);

  // Post.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Sizing.
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // Pull back on narrow screens so the core never crops.
    camera.position.z = w / h < 0.8 ? 11.5 : 8.2;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Pointer.
  const pointer = new THREE.Vector2();
  const eased = new THREE.Vector2();
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  if (interactive) window.addEventListener("pointermove", onMove, { passive: true });

  // Loop.
  const clock = new THREE.Clock();
  const speed = reducedMotion ? 0.25 : 1;
  const screen = new THREE.Vector3();
  let hover = 0;
  let raf = 0;
  let running = true;

  const tick = () => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime() * speed;
    const intro = 1 - Math.pow(1 - Math.min(clock.getElapsedTime() / 2.4, 1), 4);

    eased.lerp(pointer, 0.05);
    camera.position.x = eased.x * 0.45;
    camera.position.y = 1.55 + eased.y * 0.2;
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();

    // Hover: open the core wider as the pointer nears it.
    screen.copy(core.position).project(camera);
    const near = Math.max(0, 1 - pointer.distanceTo(new THREE.Vector2(screen.x, screen.y)) / 0.55);
    hover += (near - hover) * 0.06;

    const breath = 0.5 + 0.5 * Math.sin(t * 0.55);
    shards.forEach((s) => {
      const e =
        0.02 +
        0.045 * breath +
        0.025 * Math.sin(t * 1.3 + s.phase) +
        0.14 * hover +
        (1 - intro) * 1.6;
      s.group.position.copy(s.dir).multiplyScalar(e);
    });

    core.position.y = lookAt.y + Math.sin(t * 0.8) * 0.08;
    core.rotation.y = t * 0.18 + eased.x * 0.5;
    core.rotation.x = Math.sin(t * 0.3) * 0.12 - eased.y * 0.25;
    core.rotation.z = Math.sin(t * 0.21) * 0.06;

    const pulse = 0.85 + 0.25 * breath + 0.4 * hover;
    heart.scale.setScalar(0.92 + 0.08 * breath);
    wallUniforms.uIntensity.value = pulse;
    seaUniforms.uCorePulse.value = pulse * intro;
    seaUniforms.uCore.value.copy(core.position);
    seaUniforms.uTime.value = t;

    // Motes rise slowly and wrap.
    const p = moteGeo.attributes.position.array;
    for (let i = 0; i < MOTES; i++) {
      p[i * 3 + 1] += 0.0025 * speed;
      if (p[i * 3 + 1] > 6) p[i * 3 + 1] = -0.2;
    }
    moteGeo.attributes.position.needsUpdate = true;

    composer.render();
  };

  // Pause when off-screen / tab hidden.
  const io = new IntersectionObserver(([entry]) => {
    const vis = entry.isIntersecting && !document.hidden;
    if (vis && !running) (running = true), tick();
    else if (!vis) (running = false), cancelAnimationFrame(raf);
  });
  io.observe(canvas);
  tick();

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      shards.forEach((s) => s.edges.dispose());
      [faceMat, wallMat, lineMat, sea.material, sky.material, heart.material, motes.material].forEach((m) => m.dispose());
      env.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
