// 12 — Ferrofluid: a glossy black magnetic blob that bristles into spikes toward the cursor.
export default {
  id: "12",
  name: "Ferrofluid",
  blurb: "A bead of black magnetic liquid. Your cursor is the magnet — spikes rise wherever it points.",
  theme: "ember",
  camera: { fov: 34, position: [0, 0.35, 8.2], target: [0, 0.35, 0] },
  bloom: { strength: 0.75, radius: 0.55, threshold: 0.8 },
  exposure: 1.05,

  setup({ THREE, scene, camera, renderer, pointer, glsl, sky, track }) {
    sky({ top: "#02050d", mid: "#081330", horizon: "#1b3264", haze: 0.15 });

    // Studio environment: dark room with a few luminous softboxes for crisp reflections.
    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const env = new THREE.Scene();
    env.background = new THREE.Color("#02040a");
    const box = (w, h, col, pos, rot = [0, 0, 0]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      m.position.set(...pos); m.rotation.set(...rot); m.lookAt(0, 0, 0); env.add(m);
    };
    box(14, 1.6, new THREE.Color(14, 15, 18), [0, 12, 4]);
    box(2, 16, new THREE.Color(2, 5, 16), [-12, 0, -6]);
    box(2, 16, new THREE.Color(4, 3.5, 14), [12, 1, -5]);
    box(20, 1.2, new THREE.Color(1, 2.5, 8), [0, -8, -10]);
    box(3, 2, new THREE.Color(8, 9, 12), [5, 4, 12]);
    const envRT = track(pmrem.fromScene(env, 0.02));
    scene.environment = envRT.texture;

    // Spike field: Fibonacci directions on the sphere, per-spike height eased on the CPU.
    const N = 150;
    const dirs = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - ((i + 0.5) / N) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996323;
      dirs.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const spikes = Array.from({ length: N }, () => new THREE.Vector4());
    const heights = new Float32Array(N);

    const uniforms = { uTime: { value: 0 }, uSpikes: { value: spikes }, uRim: { value: new THREE.Color(0.12, 0.3, 1.1) } };
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x010103, metalness: 0.2, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1 });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader = s.vertexShader
        .replace("#include <common>", `#include <common>
          uniform float uTime; uniform vec4 uSpikes[${N}];
          ${glsl.noise}
          vec3 blob(vec3 n){
            float r = 1.15 + snoise(n * 1.3 + vec3(0.0, uTime * 0.25, 0.0)) * 0.07;
            float h = 0.0;
            for (int i = 0; i < ${N}; i++) {
              float d = dot(n, uSpikes[i].xyz);
              if (d > 0.94) {
                float f = 1.0 - acos(min(d, 1.0)) / 0.348;
                float v = f * f * uSpikes[i].w; v *= v; h += v * v;
              }
            }
            return n * (r + pow(h, 0.25));
          }`)
        .replace("#include <beginnormal_vertex>", `
          vec3 n0 = normalize(position);
          vec3 tA = normalize(cross(n0, abs(n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          vec3 tB = cross(n0, tA);
          vec3 P0 = blob(n0);
          vec3 PA = blob(normalize(n0 + tA * 0.012));
          vec3 PB = blob(normalize(n0 + tB * 0.012));
          vec3 objectNormal = normalize(cross(PA - P0, PB - P0));
          if (dot(objectNormal, n0) < 0.0) objectNormal = -objectNormal;
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
          #endif`)
        .replace("#include <begin_vertex>", `vec3 transformed = P0;`);
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", `#include <common>\nuniform vec3 uRim;`)
        .replace("#include <opaque_fragment>", `
          float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 4.0);
          outgoingLight += uRim * fr * (0.55 + 0.45 * saturate(-normal.x * 0.6 + normal.y * 0.5 + 0.5));
          #include <opaque_fragment>`);
    };
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 300, 220), mat);
    blob.position.y = 0.45;
    scene.add(blob);

    // Rim lights from behind plus a cool key.
    const rimL = new THREE.PointLight(0x6fa8ff, 18, 20, 2); rimL.position.set(-3.5, 1.5, -3); scene.add(rimL);
    const rimR = new THREE.PointLight(0x7a6cff, 8, 20, 2); rimR.position.set(3.5, -0.5, -3); scene.add(rimR);
    const key = new THREE.DirectionalLight(0xdce8ff, 0.3); key.position.set(2, 4, 5); scene.add(key);

    // Soft backlight to silhouette the blob, plus a faint ground glow.
    const glowMat = (col, pow) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uCol: { value: col } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float d = clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0); gl_FragColor = vec4(uCol * pow(1.0 - d, ${pow.toFixed(1)}), 1.0); }`,
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), glowMat(new THREE.Color(0.1, 0.2, 0.6), 2.5));
    halo.position.set(0, 0.6, -2.4);
    scene.add(halo);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 64),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(vec3(0.07, 0.13, 0.36) * pow(1.0 - clamp(d, 0.0, 1.0), 3.0), 1.0); }`,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -1.3;
    scene.add(pool);

    const magnet = new THREE.Vector3();
    const local = new THREE.Vector3();
    const inv = new THREE.Quaternion();
    return (t, dt) => {
      uniforms.uTime.value = t;
      blob.rotation.y = t * 0.08;
      blob.rotation.z = Math.sin(t * 0.3) * 0.08;
      blob.position.y = 0.45 + Math.sin(t * 0.8) * 0.05;
      halo.rotation.z = t * 0.05;

      // Magnet direction: the cursor, with a slow idle drift so it never sits still.
      magnet.set(pointer.x * 1.9 + Math.sin(t * 0.37) * 0.35, pointer.y * 1.5 + 0.55 + Math.cos(t * 0.29) * 0.25, 0.9).normalize();
      inv.copy(blob.quaternion).invert();
      local.copy(magnet).applyQuaternion(inv);
      const k = 1 - Math.exp(-dt * 5);
      for (let i = 0; i < N; i++) {
        const d = dirs[i].dot(local);
        const pull = Math.pow(Math.max(0, (d - 0.35) / 0.65), 2.2);
        const target = pull * (0.9 + 0.15 * Math.sin(t * 1.7 + i * 1.3));
        heights[i] += (target - heights[i]) * k;
        spikes[i].set(dirs[i].x, dirs[i].y, dirs[i].z, heights[i]);
      }
      camera.position.x = pointer.x * 0.35;
      camera.lookAt(0, 0.35, 0);
    };
  },
};
