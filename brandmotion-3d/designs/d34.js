// 34 — Coil Springs: a kinetic sculpture of chrome coils compressing and releasing in rhythm.
export default {
  id: "34",
  name: "Coil Springs",
  blurb: "Chrome coils pulse in a travelling rhythm on a black plinth. Hover to press down the nearest spring.",
  camera: { fov: 34, position: [0, 1.3, 10.5], target: [0, 0.0, 0] },
  bloom: { strength: 0.7, radius: 0.5, threshold: 0.85 },
  exposure: 1.05,

  setup({ THREE, scene, camera, renderer, sky, pointer, track }) {
    const skyMesh = sky({ haze: 0.3, horizon: "#2d4c8a", mid: "#0b1a3c" });
    scene.remove(skyMesh); // used for reflections only

    // Studio-style reflections: the sky plus a few soft light strips.
    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const envScene = new THREE.Scene();
    envScene.add(skyMesh.clone());
    const strip = (w, h, x, y, z, c) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    };
    strip(60, 6, 0, 40, -40, [3.2, 3.6, 4.4]);
    strip(8, 50, -45, 5, 10, [1.2, 1.6, 2.6]);
    strip(8, 50, 45, 5, 10, [1.0, 1.1, 2.4]);
    strip(40, 4, 0, -10, 50, [0.6, 0.8, 1.4]);
    const envRT = track(pmrem.fromScene(envScene, 0.02));
    scene.environment = envRT.texture;

    // Helix tube, built at rest height; the shader compresses it along y without squashing the wire.
    const TURNS = 8, H0 = 2.3, RAD = 0.36, WIRE = 0.05, TS = TURNS * 36, RS = 10;
    class Helix extends THREE.Curve {
      getPoint(u, out = new THREE.Vector3()) {
        const a = u * TURNS * Math.PI * 2;
        return out.set(Math.cos(a) * RAD, u * H0, Math.sin(a) * RAD);
      }
    }
    const helix = new THREE.TubeGeometry(new Helix(), TS, WIRE, RS, false);
    const aY = new Float32Array(helix.attributes.position.count);
    for (let i = 0; i <= TS; i++) for (let j = 0; j <= RS; j++) aY[i * (RS + 1) + j] = (i / TS) * H0;
    helix.setAttribute("aY", new THREE.BufferAttribute(aY, 1));

    const COUNT = 5, GAP = 1.3, BASE = -1.0;
    const springs = [];
    for (let i = 0; i < COUNT; i++) {
      const u = { uS: { value: 1 } };
      const mat = new THREE.MeshPhysicalMaterial({ color: 0xb9c9ea, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
      mat.onBeforeCompile = (s) => {
        s.uniforms.uS = u.uS;
        s.vertexShader = s.vertexShader
          .replace("#include <common>", "#include <common>\nattribute float aY; uniform float uS;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y = aY * uS + (position.y - aY);");
      };
      const mesh = new THREE.Mesh(helix, mat);
      const x = (i - (COUNT - 1) / 2) * GAP;
      mesh.position.set(x, BASE, 0);
      mesh.rotation.y = i * 1.3;
      scene.add(mesh);

      // Cap: glossy puck with a luminous rim.
      const cap = new THREE.Group();
      const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 48), new THREE.MeshPhysicalMaterial({ color: 0x0b1428, metalness: 0.7, roughness: 0.2, clearcoat: 1 }));
      const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.9, 2.8), toneMapped: false });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.014, 8, 64), rimMat);
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.05;
      cap.add(puck, rim);
      scene.add(cap);
      springs.push({ x, u, cap, rimMat, h: 1, v: 0, press: 0 });
    }

    // Plinth with a glowing seam.
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(COUNT * GAP + 0.9, 0.36, 1.5), new THREE.MeshPhysicalMaterial({ color: 0x070c18, metalness: 0.6, roughness: 0.25, clearcoat: 1 }));
    plinth.position.y = BASE - 0.18;
    scene.add(plinth);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(COUNT * GAP + 0.92, 0.012, 1.52), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.65, 1.2), toneMapped: false }));
    seam.position.y = BASE - 0.02;
    scene.add(seam);
    // Base discs under each coil.
    for (const s of springs) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 48), new THREE.MeshPhysicalMaterial({ color: 0x0c1630, metalness: 0.9, roughness: 0.2 }));
      d.position.set(s.x, BASE + 0.01, 0);
      scene.add(d);
    }

    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshBasicMaterial({ color: 0x02040b }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = BASE - 0.36;
    scene.add(floor);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(vec3(0.03, 0.06, 0.16) * pow(1.0 - d, 3.0), 1.0); }",
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = BASE - 0.355;
    scene.add(pool);

    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.ShaderMaterial({
      depthWrite: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; void main(){ vec2 p = (vUv - vec2(0.5, 0.56)) * vec2(2.0, 1.2); float g = exp(-dot(p, p) * 8.0) * smoothstep(0.4, 0.56, vUv.y); gl_FragColor = vec4(mix(vec3(0.0012, 0.0028, 0.007), vec3(0.018, 0.035, 0.09), g), 1.0); }",
    }));
    backdrop.position.set(0, 2, -12);
    scene.add(backdrop);
    scene.fog = new THREE.Fog(0x040914, 14, 34);

    const key = new THREE.DirectionalLight(0xdce8ff, 1.2);
    key.position.set(3, 6, 5);
    scene.add(key);

    const base = camera.position.clone();
    const look = new THREE.Vector3(0, 0.0, 0);
    return (t, dt) => {
      // Pointer x in world units on the z=0 plane.
      const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * base.z * camera.aspect;
      const px = pointer.x * halfW;
      const depth = 0.25 + 0.3 * (1 - (pointer.y + 1) / 2);
      for (let i = 0; i < COUNT; i++) {
        const s = springs[i];
        const ph = t * 1.5 - i * 0.75;
        const beat = Math.pow(0.5 + 0.5 * Math.sin(ph), 3);
        s.press += (Math.exp(-((s.x - px) ** 2) / 0.35) * depth - s.press) * Math.min(dt * 5, 1);
        const target = 1 - beat * 0.38 - s.press;
        const k = 90, d = 7;
        s.v += (k * (target - s.h) - d * s.v) * dt;
        s.h += s.v * dt;
        s.h = Math.max(s.h, 0.32);
        s.u.uS.value = s.h;
        s.cap.position.set(s.x, BASE + H0 * s.h + 0.05, 0);
        const e = 0.55 + (1 - s.h) * 2.2 + Math.abs(s.v) * 0.15;
        s.rimMat.color.setRGB(0.9 * e, 1.2 * e, 2.0 * e);
      }
      camera.position.set(base.x + pointer.x * 0.9, base.y + pointer.y * 0.5, base.z);
      camera.lookAt(look);
    };
  },
};
