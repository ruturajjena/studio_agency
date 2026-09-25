// 32 — Ice Spires: jagged translucent ice erupts from a frozen lake under drifting snow.
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export default {
  id: "32",
  name: "Ice Spires",
  blurb: "Crystal spires burst through a frozen lake. Spires near your cursor kindle with frost light.",
  camera: { fov: 38, position: [0, 1.6, 10.5], target: [0, 1.25, 0] },
  bloom: { strength: 0.6, radius: 0.5, threshold: 0.82 },
  exposure: 1.05,

  setup({ THREE, scene, camera, sky, pointer, rand, glsl, target }) {
    sky({ haze: 0.3, horizon: "#28447e", mid: "#0a1736", top: "#02050d" });
    scene.fog = new THREE.FogExp2(0x061026, 0.035);
    const r = rand(32);

    // Faceted crystal: slightly tapered hex prism with a pointed cap, base at y=0, height 1.
    const body = new THREE.CylinderGeometry(0.72, 1, 0.74, 6, 1).translate(0, 0.37, 0).toNonIndexed();
    const cap = new THREE.ConeGeometry(0.72, 0.26, 6, 1).translate(0, 0.87, 0).toNonIndexed();
    body.deleteAttribute("uv"); cap.deleteAttribute("uv");
    const geo = mergeGeometries([body, cap]);
    const pos = geo.attributes.position;
    const jit = new Map();
    for (let i = 0; i < pos.count; i++) {
      const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
      if (!jit.has(key)) jit.set(key, [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25, pos.getY(i) > 0.99 ? 0 : (r() - 0.5) * 0.06]);
      const [jx, jz, jy] = jit.get(key);
      pos.setXYZ(i, pos.getX(i) + jx, pos.getY(i) + jy, pos.getZ(i) + jz);
    }
    geo.computeVertexNormals();

    // Spire layout: a tall central cluster plus satellites.
    const spires = [];
    const clusters = [[0, 0, 1], [-3.2, -1.2, 0.6], [3.0, -0.8, 0.65], [-1.6, -3.6, 0.45], [2.0, -4.2, 0.5], [0.6, 2.2, 0.4]];
    for (const [cx, cz, s] of clusters) {
      const n = Math.round(6 + s * 10);
      for (let j = 0; j < n; j++) {
        const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * (0.3 + s * 1.3);
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        const h = s * (3.4 - d * 1.2) * (0.55 + r() * 0.5);
        if (h < 0.25) continue;
        spires.push({
          x, z, h, w: h * (0.07 + r() * 0.06),
          tilt: new THREE.Euler((z - cz) * 0.22 + (r() - 0.5) * 0.25, r() * 6.28, -(x - cx) * 0.22 + (r() - 0.5) * 0.25),
          delay: 0.05 + (d / (0.3 + s * 1.3)) * 0.6 + r() * 0.4 + (s < 1 ? 0.3 : 0),
          period: 9 + r() * 7, cyc: r() < 0.3, glow: 0,
        });
      }
    }
    const N = spires.length;
    const aGlow = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
    aGlow.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aGlow", aGlow);

    const iceShader = (mirror) => new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: mirror,
      depthWrite: !mirror,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aGlow; varying vec3 vN; varying vec3 vW; varying float vH; varying float vG;
        void main(){
          mat4 m = modelMatrix * instanceMatrix;
          vec4 wp = m * vec4(position, 1.0);
          vN = normalize(transpose(inverse(mat3(m))) * normal); vW = wp.xyz; vH = position.y; vG = aGlow;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform float uTime; varying vec3 vN; varying vec3 vW; varying float vH; varying float vG;
        ${glsl.noise}
        void main(){
          vec3 V = normalize(cameraPosition - vW);
          vec3 N = normalize(vN); if (dot(N, V) < 0.0) N = -N;
          float fr = pow(1.0 - max(dot(N, V), 0.0), 2.2);
          vec3 L = normalize(vec3(-0.3, 0.35, -1.0));
          float facet = 0.5 + 0.5 * dot(N, normalize(vec3(0.35, 0.6, 0.7)));
          vec3 deep = vec3(0.015, 0.045, 0.13), ice = vec3(0.5, 0.7, 1.0);
          vec3 col = mix(deep, vec3(0.05, 0.13, 0.34), facet * facet);
          col += vec3(0.1, 0.25, 0.6) * pow(vH, 3.0) * 0.35;
          float vein = snoise(vW * vec3(2.4, 0.7, 2.4) + vec3(0.0, uTime * 0.05, 0.0));
          col += vec3(0.5, 0.75, 1.4) * (1.0 - smoothstep(0.0, 0.06, abs(vein))) * (0.15 + 0.35 * vH);
          col += vec3(0.45, 0.7, 1.3) * pow(fr, 1.6) * 0.9;
          col += vec3(0.8, 0.9, 1.3) * pow(max(dot(reflect(-V, N), L), 0.0), 18.0) * 0.7;
          col += vec3(0.25, 0.45, 1.0) * exp(-max(vW.y, 0.0) * 2.5) * 0.2;
          col += vec3(0.4, 0.65, 1.5) * vG * (0.45 + 2.0 * fr + vH * 0.8);
          col += vec3(0.8, 0.95, 1.8) * vG * smoothstep(0.85, 1.0, vH) * 0.9;
          float a = 1.0;
          ${mirror ? "col *= 0.35; a = 0.5 * exp(vW.y * 0.9);" : ""}
          gl_FragColor = vec4(col, a);
        }`,

    });
    const iceMat = iceShader(false);
    const spireMesh = new THREE.InstancedMesh(geo, iceMat, N);
    spireMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    spireMesh.frustumCulled = false;
    scene.add(spireMesh);

    // Mirror image under the ice (shares matrices and glow).
    const mirMat = iceShader(true);
    const mirror = new THREE.InstancedMesh(geo, mirMat, N);
    mirror.instanceMatrix = spireMesh.instanceMatrix;
    mirror.frustumCulled = false;
    mirror.scale.y = -1;
    mirror.renderOrder = -1;
    scene.add(mirror);

    // Frozen lake: dark translucent ice with frost cracks and glow pools.
    const lakeU = { uTime: { value: 0 }, uP: { value: new THREE.Vector3(0, 0, 99) } };
    const lake = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: lakeU,
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `
          uniform float uTime; uniform vec3 uP; varying vec3 vW;
          vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
          float cracks(vec2 p){
            vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
            for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
              vec2 g = vec2(x, y); vec2 o = h2(i + g); float d = length(g + o - f);
              if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
            }
            return 1.0 - smoothstep(0.0, 0.05, d2 - d1);
          }
          void main(){
            vec2 p = vW.xz; float dist = length(cameraPosition - vW);
            float c = cracks(p * 0.9) * 0.6 + cracks(p * 2.3 + 7.0) * 0.4;
            float pool = exp(-dot(p, p) * 0.12) + 0.5 * exp(-dot(p - vec2(-3.2, -1.2), p - vec2(-3.2, -1.2)) * 0.4) + 0.5 * exp(-dot(p - vec2(3.0, -0.8), p - vec2(3.0, -0.8)) * 0.4);
            float pg = exp(-dot(p - uP.xz, p - uP.xz) * 0.35);
            vec3 col = vec3(0.012, 0.03, 0.075);
            col += vec3(0.2, 0.4, 0.95) * pool * 0.12;
            col += vec3(0.4, 0.6, 1.2) * c * (0.02 + pool * 0.25 + pg * 0.5) * exp(-dist * 0.08);
            col += vec3(0.3, 0.5, 1.0) * pg * 0.08;
            float fres = smoothstep(4.0, 40.0, dist);
            float a = mix(0.8, 0.45, fres);
            col = mix(col, vec3(0.02, 0.04, 0.1), smoothstep(20.0, 60.0, dist));
            gl_FragColor = vec4(col, a);
          }`,
      })
    );
    lake.rotation.x = -Math.PI / 2;
    scene.add(lake);

    // Drifting snow.
    const S = 1500, sp = new Float32Array(S * 3), ss = new Float32Array(S);
    for (let i = 0; i < S; i++) {
      sp[i * 3] = (r() - 0.5) * 22; sp[i * 3 + 1] = r() * 9; sp[i * 3 + 2] = (r() - 0.5) * 18 - 2; ss[i] = r();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sg.setAttribute("aS", new THREE.BufferAttribute(ss, 1));
    const snowU = { uTime: { value: 0 }, uWind: { value: 0 } };
    const snow = new THREE.Points(sg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: snowU,
      vertexShader: `
        uniform float uTime, uWind; attribute float aS; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y - uTime * (0.25 + aS * 0.35), 9.0) - 0.2;
          p.x = mod(p.x + 11.0 + uTime * (0.25 + uWind) + sin(uTime * 0.7 + aS * 40.0) * 0.4, 22.0) - 11.0;
          p.z += cos(uTime * 0.5 + aS * 30.0) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.0 + aS * 2.2) * (7.0 / -mv.z);
          vA = smoothstep(-0.2, 0.6, p.y) * (0.15 + 0.45 * aS);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.8, 0.9, 1.3) * vA * smoothstep(0.5, 0.0, d), 1.0); }`,
    }));
    snow.frustumCulled = false;
    scene.add(snow);

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const hit = new THREE.Vector3();
    const base = camera.position.clone();
    const easeBack = (x) => { const c = 1.9; x = Math.min(Math.max(x, 0), 1); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

    return (t, dt) => {
      camera.position.set(base.x + pointer.x * 1.4, base.y + pointer.y * 0.45, base.z - Math.abs(pointer.x) * 0.3);
      camera.lookAt(target);

      hit.set(pointer.x * 5.5, 0, 1.5 - (pointer.y + 1) * 3);
      lakeU.uP.value.lerp(hit, 0.2);

      for (let i = 0; i < N; i++) {
        const s = spires[i];
        let g = easeBack((t - s.delay) / 0.9);
        let burst = Math.exp(-Math.max(t - s.delay, 0) * 3.5) * (t > s.delay ? 1 : 0);
        if (s.cyc && t > s.delay + 1) {
          const lt = (t - s.delay) % s.period;
          const sink = lt > s.period - 1.6 ? 1 - (lt - (s.period - 1.6)) / 1.6 : 1;
          const rise = easeBack(lt / 0.9);
          g = Math.min(Math.max(sink, 0) * 1, rise);
          burst = Math.max(burst, Math.exp(-lt * 2.2));
        }
        const d2 = (s.x - lakeU.uP.value.x) ** 2 + (s.z - lakeU.uP.value.z) ** 2;
        const target = Math.exp(-d2 * 0.35) * 1.1 + burst * 0.5;
        s.glow += (target - s.glow) * Math.min(dt * 6, 1);
        aGlow.array[i] = s.glow + 0.08 * Math.sin(t * 1.3 + i);
        q.setFromEuler(s.tilt);
        const hh = Math.max(g, 0.0001) * s.h;
        m4.compose(v.set(s.x, -0.05, s.z), q, sc.set(s.w, hh, s.w));
        spireMesh.setMatrixAt(i, m4);
      }
      spireMesh.instanceMatrix.needsUpdate = true;
      aGlow.needsUpdate = true;
      iceMat.uniforms.uTime.value = mirMat.uniforms.uTime.value = t;
      lakeU.uTime.value = t;
      snowU.uTime.value = t;
      snowU.uWind.value = pointer.x * 0.4;
    };
  },
};
