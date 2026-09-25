// 03 — Particle Galaxy: twenty thousand stars wound into a slow spiral around a blazing core.
export default {
  id: "03",
  name: "Particle Galaxy",
  blurb: "A spiral galaxy of twenty thousand stars. Your cursor acts as a gravity well that gathers and swirls them.",
  theme: "neon",
  camera: { fov: 42, position: [0, 4.4, 7.6], target: [0, -0.35, 0] },
  bloom: { strength: 0.7, radius: 0.5, threshold: 0.7 },
  exposure: 1.0,

  setup({ THREE, scene, camera, renderer, pointer, palette, rand, onResize }) {
    const R = rand(3);
    const gauss = () => (R() + R() + R() - 1.5) / 1.5;
    const N = 20000, ARMS = 3;
    const base = new Float32Array(N * 3); // radius, angle, height
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const seed = new Float32Array(N);
    const cCore = new THREE.Color("#fff3e2"), cGlow = new THREE.Color(palette.glow), cIce = new THREE.Color(palette.ice),
      cBlue = new THREE.Color(palette.blue), cCyan = new THREE.Color(palette.cyan), cViolet = new THREE.Color(palette.violet);
    const c = new THREE.Color();
    const NEB = 600; // large faint sprites that read as glowing gas along the arms
    for (let i = 0; i < N; i++) {
      let r, a, y, s = 0.55 + R() * 0.9;
      if (i < N * 0.12) {
        // Bulge.
        r = Math.abs(gauss()) * 0.7;
        a = R() * Math.PI * 2;
        y = gauss() * 0.3 * (1 - r);
        c.copy(cCore).lerp(cGlow, r * 1.3).multiplyScalar(0.32);
      } else if (i < N * 0.3) {
        // Diffuse disk between the arms.
        r = 0.4 + Math.pow(R(), 0.9) * 4.4;
        a = R() * Math.PI * 2;
        y = gauss() * 0.1;
        c.copy(cIce).lerp(cBlue, r / 4.4).multiplyScalar(0.55);
        s *= 0.8;
      } else {
        const arm = i % ARMS;
        r = 0.3 + Math.pow(R(), 1.2) * 4.2;
        const spread = gauss() * (0.5 + 0.1 * r) / (0.8 + r * 0.3);
        a = (arm / ARMS) * Math.PI * 2 + r * 1.1 + spread;
        r += gauss() * 0.28;
        y = gauss() * 0.12 * (1.2 - r / 5);
        const tt = Math.min(r / 4.2, 1);
        c.copy(cGlow).lerp(cIce, Math.min(tt * 1.4, 1)).lerp(cBlue, Math.max(0, tt - 0.45) * 1.3);
        const k = R();
        if (k < 0.04) c.copy(cCyan);
        else if (k < 0.07) c.copy(cViolet);
        if (i >= N - NEB) {
          s = 25 + R() * 30;
          c.copy(R() < 0.25 ? cViolet : cBlue).multiplyScalar(0.035);
        }
      }
      base.set([r, a, y], i * 3);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = (R() < 0.03 ? 2.4 : 1) * s;
      seed[i] = R() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(base, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3(99, 0, 99) },
      uScale: { value: 400 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uScale; uniform vec3 uMouse;
        attribute vec3 aColor; attribute float aSize, aSeed;
        varying vec3 vColor; varying float vBright;
        void main(){
          float r = position.x;
          float a = position.y + uTime * 0.06 + sin(uTime * 0.3 + aSeed) * 0.03 / (0.4 + r);
          vec3 p = vec3(cos(a) * r, position.z, sin(a) * r);
          // Gravity well: pull and swirl stars around the cursor.
          vec2 d = uMouse.xz - p.xz;
          float f = exp(-dot(d, d) * 0.55) * smoothstep(0.4, 1.6, length(uMouse.xz)); // calm over the core
          float sw = f * 2.2;
          vec2 rel = -d;
          rel = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * rel;
          p.xz = uMouse.xz + rel * (1.0 - f * 0.7);
          p.y += f * 0.35 * sin(aSeed + uTime * 2.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.75 + 0.25 * sin(uTime * 2.3 + aSeed * 7.0);
          gl_PointSize = aSize * (1.0 + f * 1.2) * uScale * 0.018 / -mv.z;
          vBright = tw * (1.0 + f * 2.5);
          vColor = aColor;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vBright;
        void main(){
          vec2 q = gl_PointCoord - 0.5;
          float d = dot(q, q) * 4.0;
          float a = exp(-d * 4.0) + exp(-d * 18.0) * 0.8;
          gl_FragColor = vec4(vColor * a * vBright * 0.9, 1.0);
        }`,
    });
    const galaxy = new THREE.Group();
    scene.add(galaxy);
    const stars = new THREE.Points(geo, mat);
    galaxy.add(stars);

    // Core glow billboard.
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const g = cv.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,246,232,1)");
    grd.addColorStop(0.15, "rgba(220,232,255,0.55)");
    grd.addColorStop(0.45, "rgba(90,130,230,0.12)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(cv);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.1, 1.1, 1.2) }));
    core.scale.setScalar(1.8);
    galaxy.add(core);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.1, 0.15, 0.4), opacity: 0.4 }));
    halo.scale.setScalar(9);
    galaxy.add(halo);

    // Distant field stars.
    const fn = 1800, fp = new Float32Array(fn * 3);
    for (let i = 0; i < fn; i++) {
      const v = new THREE.Vector3(gauss(), gauss(), gauss()).normalize().multiplyScalar(80 + R() * 40);
      fp.set([v.x, v.y, v.z], i * 3);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
    scene.add(new THREE.Points(fg, new THREE.PointsMaterial({ color: palette.ice, size: 0.35, transparent: true, opacity: 0.6, depthWrite: false })));

    onResize((s) => (uniforms.uScale.value = s.height * renderer.getPixelRatio()));

    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const inv = new THREE.Matrix4();
    let first = true;

    return (t) => {
      uniforms.uTime.value = t;
      galaxy.rotation.x = pointer.y * 0.18;
      galaxy.rotation.z = -pointer.x * 0.12;
      galaxy.updateMatrixWorld();
      // Cursor → galaxy plane (in galaxy space).
      plane.normal.set(0, 1, 0).applyQuaternion(galaxy.quaternion);
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        hit.applyMatrix4(inv.copy(galaxy.matrixWorld).invert());
        uniforms.uMouse.value.lerp(hit, first ? 1 : 0.2);
        first = false;
      }
    };
  },
};
