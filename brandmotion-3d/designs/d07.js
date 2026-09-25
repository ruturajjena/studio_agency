// 07 — Pulse Grid: a field of hexagonal pillars that surge in waves from the cursor.
export default {
  id: "07",
  name: "Pulse Grid",
  blurb: "A floor of hexagonal pillars. Waves of light and motion ripple outward from wherever your cursor rests.",
  theme: "citrus",
  camera: { fov: 36, position: [0, 11, 12.5], target: [0, -0.6, -0.8] },
  bloom: { strength: 0.75, radius: 0.5, threshold: 0.78 },
  exposure: 1.0,

  setup({ THREE, scene, camera, renderer, pointer, palette, glsl, track }) {
    scene.fog = new THREE.FogExp2(palette.ink, 0.045);

    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const env = new THREE.Scene();
    env.background = new THREE.Color("#050a18");
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.5, 0.9), side: THREE.DoubleSide }));
    panel.position.set(0, 30, -10);
    panel.lookAt(0, 0, 0);
    env.add(panel);
    scene.environment = track(pmrem.fromScene(env, 0.04)).texture;

    const key = new THREE.DirectionalLight(palette.ice, 0.8);
    key.position.set(-4, 8, 3);
    const cursorLight = new THREE.PointLight(palette.cyan, 30, 9, 1.8);
    scene.add(key, cursorLight, new THREE.HemisphereLight(palette.horizon, palette.ink, 0.25));

    // Hex layout (pointy along z).
    const r = 0.34, gap = 0.92, cols = 64, rows = 72;
    const dx = Math.sqrt(3) * r, dz = 1.5 * r;
    const count = cols * rows;
    const geo = new THREE.CylinderGeometry(r * gap, r * gap, 1, 6, 1);
    const RIPS = 8;
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3() },
      uRip: { value: Array.from({ length: RIPS }, () => new THREE.Vector4(0, 0, -99, 0)) },
      uHot: { value: new THREE.Color(palette.glow) },
      uCool: { value: new THREE.Color(palette.blue) },
      uAccent: { value: new THREE.Color(palette.cyan) },
      uApo: { value: r * gap * 0.866 },
    };
    const mat = new THREE.MeshStandardMaterial({ color: 0x070d1d, metalness: 0.7, roughness: 0.3, envMapIntensity: 0.7 });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader = s.vertexShader
        .replace("#include <common>", `#include <common>
          uniform float uTime; uniform vec3 uMouse; uniform vec4 uRip[${RIPS}];
          varying float vH; varying float vTop; varying float vLy; varying float vNear; varying vec2 vLoc;
          ${glsl.noise}
          float heightAt(vec2 c){
            float h = 0.35 + 0.18 * snoise(vec3(c * 0.12, uTime * 0.12));
            for (int i = 0; i < ${RIPS}; i++){
              float age = uTime - uRip[i].z;
              if (age < 0.0 || age > 7.0) continue;
              float d = distance(c, uRip[i].xy);
              float x = d - age * 3.6;
              h += uRip[i].w * exp(-x * x * 0.5) * exp(-age * 0.42) / (1.0 + d * 0.08);
            }
            float dm = distance(c, uMouse.xz);
            h += 1.9 * exp(-dm * dm * 0.3) * (0.8 + 0.2 * sin(uTime * 3.0 - dm * 1.5));
            return h;
          }`)
        .replace("#include <begin_vertex>", `
          vec2 cell = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
          float h = heightAt(cell);
          vec3 transformed = vec3(position.x, (position.y + 0.5) * h, position.z);
          vH = h; vTop = step(0.5, normal.y); vLy = (position.y + 0.5); vLoc = position.xz;
          vNear = exp(-pow(distance(cell, uMouse.xz), 2.0) * 0.12);`);
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", `#include <common>
          uniform vec3 uHot, uCool, uAccent; uniform float uApo; varying float vH; varying float vTop; varying float vLy; varying float vNear; varying vec2 vLoc;`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float lift = smoothstep(0.6, 2.3, vH);
          vec3 tint = mix(uCool * 0.6, uHot * 2.4, lift);
          tint = mix(tint, uAccent * 2.2, vNear * 0.6 * lift);
          float hd = max(abs(vLoc.x), max(abs(0.5 * vLoc.x + 0.866 * vLoc.y), abs(0.5 * vLoc.x - 0.866 * vLoc.y))) / uApo;
          float rim = smoothstep(0.8, 0.97, hd);
          float sideGlow = pow(vLy, 14.0) * lift;
          totalEmissiveRadiance += vTop * (tint * (rim * (0.35 + 0.9 * lift) + lift * lift * 0.55) + uCool * 0.02)
                                 + (1.0 - vTop) * tint * sideGlow * 0.6;`);
    };
    const pillars = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const x = (col - cols / 2 + (row % 2) * 0.5) * dx;
        const z = (row - rows / 2) * dz;
        m.makeTranslation(x, 0, z);
        pillars.setMatrixAt(i++, m);
      }
    pillars.frustumCulled = false;
    scene.add(pillars);

    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
    const hit = new THREE.Vector3();
    let next = 0, slot = 0;

    return (t) => {
      uniforms.uTime.value = t;
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(hit);
      if (t > next) {
        uniforms.uRip.value[slot].set(hit.x, hit.z, t, 1.6);
        slot = (slot + 1) % RIPS;
        next = t + 1.1;
      }
      cursorLight.position.set(hit.x, 3.2, hit.z);
    };
  },
};
