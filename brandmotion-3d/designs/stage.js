/**
 * BrandMotion design stage — the shared runtime every design plugs into.
 *
 * A design module default-exports:
 *   {
 *     id: "07", name: "Pulse Grid", blurb: "One line.",
 *     camera?: { fov?, position?: [x,y,z], target?: [x,y,z] },
 *     bloom?:  { strength?, radius?, threshold? },
 *     exposure?: number,
 *     theme?: "sunset",               // default colour theme (see THEMES)
 *     background?: "#hex",
 *     setup(ctx) → update(t, dt)      // called every frame
 *   }
 *
 * ctx = { THREE, scene, camera, renderer, canvas, pointer, pointerRaw,
 *         palette, rand, glsl, sky(opts), size, onResize(fn), reducedMotion }
 *   pointer     eased Vector2 in [-1, 1] (x right, y up)
 *   pointerRaw  unsmoothed Vector2
 *   size        { width, height, aspect } — kept current
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

/** BrandMotion night palette. Designs should stay inside this family. */
export const PALETTE = {
  ink: "#040914", // deepest background
  night: "#0a1733",
  navy: "#12264f",
  blue: "#2c55a8",
  horizon: "#4a6fae",
  ice: "#9fc0ff",
  glow: "#dce8ff", // luminous white-blue
  cyan: "#6fe3ff", // sparing accent
  violet: "#7a6cff", // sparing accent
};

/**
 * Colour themes, applied as a final grade over the rendered frame.
 * Every design is lit in the night-blue palette; a theme remaps that image's
 * brightness through colour ramps (5 stops, dark → highlight).
 *   a      ramp for single-colour themes
 *   b      optional second ramp: the frame drifts between a and b (duo themes)
 *   prism  spectral: hue follows brightness, position and time
 *   none   show the original render untouched
 */
export const THEMES = {
  midnight: { label: "Midnight", none: true, a: ["#040914", "#0f2247", "#2c55a8", "#9fc0ff", "#f2f7ff"] },
  sunset: { label: "Sunset", a: ["#0d0414", "#4a1257", "#d63d6e", "#ffa45c", "#fff1dc"] },
  ember: { label: "Ember", a: ["#0a0402", "#3f0d05", "#c2410c", "#fbbf24", "#fff8e6"] },
  gold: { label: "Gold", a: ["#0a0703", "#33230a", "#a8791c", "#f2d27a", "#fffaeb"] },
  citrus: { label: "Citrus", a: ["#070a02", "#26360a", "#84cc16", "#fde047", "#fffde8"] },
  emerald: { label: "Emerald", a: ["#020c08", "#063d2e", "#10b981", "#a7f3d0", "#f0fff8"] },
  ocean: { label: "Lagoon", a: ["#010c0e", "#07434d", "#0fb5c9", "#a5f3fc", "#f0feff"] },
  violet: { label: "Violet", a: ["#07031a", "#2e1470", "#8b5cf6", "#d8c8ff", "#f8f5ff"] },
  rose: { label: "Rose", a: ["#12070b", "#4d1e2b", "#d0788a", "#f7c9b8", "#fff6f1"] },
  aurora: { label: "Aurora", a: ["#020a0d", "#0a4a45", "#2dd4bf", "#b9f76a", "#f4fff0"], b: ["#070416", "#2c1466", "#8b5cf6", "#f0abfc", "#fdf6ff"] },
  neon: { label: "Neon", a: ["#0a0216", "#5b1487", "#ec4899", "#fda4d4", "#fff4fa"], b: ["#01080f", "#063b59", "#06b6d4", "#a5f3fc", "#f0fdff"] },
  tropic: { label: "Tropic", a: ["#0d0503", "#5a1a12", "#f25f4c", "#ffc285", "#fff6ea"], b: ["#010b0b", "#064a47", "#14b8a6", "#99f6e4", "#effffc"] },
  prism: { label: "Prism", prism: true, a: ["#05040f", "#1a1440", "#4c3aa0", "#b8a8ff", "#ffffff"] },
};

const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uA: { value: [] }, uB: { value: [] },
    uDual: { value: 0 }, uPrism: { value: 0 }, uOrig: { value: 1 }, uTime: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec3 uA[5]; uniform vec3 uB[5];
    uniform float uDual, uPrism, uOrig, uTime; varying vec2 vUv;
    vec3 ramp(vec3 s[5], float l){
      if (l < 0.1) return mix(s[0], s[1], l / 0.1);
      if (l < 0.32) return mix(s[1], s[2], (l - 0.1) / 0.22);
      if (l < 0.65) return mix(s[2], s[3], (l - 0.32) / 0.33);
      return mix(s[3], s[4], clamp((l - 0.65) / 0.35, 0.0, 1.0));
    }
    vec3 hsv(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(0.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y); }
    void main(){
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 c = src.rgb;
      // Blue-lit frames sit low in luma, so blend luma with the brightest channel.
      float l = clamp(mix(dot(c, vec3(0.2126, 0.7152, 0.0722)), max(c.r, max(c.g, c.b)), 0.5), 0.0, 1.0);
      vec3 a = ramp(uA, l);
      float band = smoothstep(0.25, 0.75, 0.5 + 0.5 * sin((vUv.x * 0.9 - vUv.y * 0.7) * 3.2 + uTime * 0.18));
      vec3 g = mix(a, ramp(uB, l), band * uDual);
      float h = fract(l * 0.7 + (vUv.x + vUv.y) * 0.32 + uTime * 0.025);
      vec3 spec = hsv(vec3(h, 0.72, min(1.0, l * 1.6)));
      spec = mix(spec, vec3(1.0), smoothstep(0.72, 1.0, l));
      g = mix(g, mix(a, spec, smoothstep(0.06, 0.35, l)), uPrism);
      gl_FragColor = vec4(mix(g, c, uOrig), src.a);
    }`,
};

/** Deterministic PRNG (mulberry32). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reusable GLSL snippets. */
export const GLSL = {
  // 3D simplex noise — snoise(vec3) in [-1, 1].
  noise: /* glsl */ `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
  `,
};

/**
 * Night-sky gradient dome. Returns the mesh (already added to the scene).
 * @param {object} [o] { top, mid, horizon, below, haze }
 */
function makeSky(scene, o = {}) {
  const c = (h) => new THREE.Color(h);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: c(o.top || "#030712") },
      uMid: { value: c(o.mid || PALETTE.navy) },
      uHorizon: { value: c(o.horizon || PALETTE.horizon) },
      uBelow: { value: c(o.below || PALETTE.ink) },
      uHaze: { value: o.haze ?? 0.25 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform vec3 uTop,uMid,uHorizon,uBelow; uniform float uHaze; varying vec3 vDir;
      void main(){ float y=normalize(vDir).y;
        vec3 col=mix(uHorizon,uMid,smoothstep(0.0,0.25,y)); col=mix(col,uTop,smoothstep(0.2,0.9,y));
        col+=uHorizon*uHaze*exp(-abs(y)*24.0); col=mix(col,uBelow,smoothstep(0.0,-0.12,y));
        gl_FragColor=vec4(col,1.0);}`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), mat);
  scene.add(mesh);
  return mesh;
}

/**
 * Mount a design on a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} design
 * @param {{ reducedMotion?: boolean, theme?: string }} [opts]  theme: a THEMES key; defaults to design.theme
 * @returns {{ dispose: () => void, setTheme: (name: string) => void }}
 */
export function createStage(canvas, design, opts = {}) {
  const reducedMotion = !!opts.reducedMotion;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = design.exposure ?? 1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(design.background || PALETTE.ink);

  const cam = design.camera || {};
  const camera = new THREE.PerspectiveCamera(cam.fov ?? 40, 1, 0.05, 800);
  camera.position.set(...(cam.position || [0, 0, 8]));
  const target = new THREE.Vector3(...(cam.target || [0, 0, 0]));
  camera.lookAt(target);
  camera.updateMatrixWorld();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const b = design.bloom || {};
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), b.strength ?? 0.8, b.radius ?? 0.5, b.threshold ?? 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GRADE_SHADER);
  composer.addPass(grade);
  const gu = grade.uniforms;
  const toVecs = (hexes) => hexes.map((h) => new THREE.Color(h));
  // Current and target theme state; switching eases between them.
  const cur = { a: toVecs(THEMES.midnight.a), b: toVecs(THEMES.midnight.a), dual: 0, prism: 0, orig: 1 };
  const goal = { ...cur };
  gu.uA.value = cur.a; gu.uB.value = cur.b;
  const setTheme = (name, instant = false) => {
    const th = THEMES[name] || THEMES.midnight;
    goal.a = toVecs(th.a);
    goal.b = toVecs(th.b || th.a);
    goal.dual = th.b ? 1 : 0; goal.prism = th.prism ? 1 : 0; goal.orig = th.none ? 1 : 0;
    if (instant) {
      cur.a.forEach((v, i) => v.copy(goal.a[i])); cur.b.forEach((v, i) => v.copy(goal.b[i]));
      cur.dual = goal.dual; cur.prism = goal.prism; cur.orig = goal.orig;
    }
  };
  setTheme(opts.theme || design.theme || "midnight", true);

  const size = { width: 1, height: 1, aspect: 1 };
  const resizeFns = [];
  const pointer = new THREE.Vector2();
  const pointerRaw = new THREE.Vector2();
  const disposables = [];

  const ctx = {
    THREE, scene, camera, renderer, canvas, composer, bloom, target,
    pointer, pointerRaw, size, reducedMotion,
    palette: PALETTE, rand: rng, glsl: GLSL,
    sky: (o) => makeSky(scene, o),
    onResize: (fn) => resizeFns.push(fn),
    /** Register anything with a dispose() that the scene traversal won't find. */
    track: (d) => (disposables.push(d), d),
  };

  const update = design.setup(ctx) || (() => {});

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    size.width = w; size.height = h; size.aspect = w / h;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    resizeFns.forEach((fn) => fn(size));
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    pointerRaw.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const clock = new THREE.Clock();
  const speed = reducedMotion ? 0.25 : 1;
  let t = 0, raf = 0, running = true;
  const tick = () => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05) * speed;
    t += dt;
    pointer.lerp(pointerRaw, 0.06);
    update(t, dt);
    const k = 1 - Math.exp(-dt * 6);
    cur.a.forEach((v, i) => v.lerp(goal.a[i], k)); cur.b.forEach((v, i) => v.lerp(goal.b[i], k));
    for (const key of ["dual", "prism", "orig"]) cur[key] += (goal[key] - cur[key]) * k;
    gu.uDual.value = cur.dual; gu.uPrism.value = cur.prism; gu.uOrig.value = cur.orig; gu.uTime.value = t;
    composer.render();
  };
  const io = new IntersectionObserver(([entry]) => {
    const vis = entry.isIntersecting;
    if (vis && !running) { running = true; clock.getDelta(); tick(); }
    else if (!vis) { running = false; cancelAnimationFrame(raf); }
  });
  io.observe(canvas);
  tick();

  return {
    setTheme,
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => {
          Object.values(m).forEach((v) => v?.isTexture && v.dispose());
          m.dispose();
        });
      });
      disposables.forEach((d) => d.dispose());
      composer.dispose();
      renderer.dispose();
    },
  };
}
