// 22 — Shattered Mirror: a night-sky mirror that cracks, bursts into floating shards and reassembles.
export default {
  id: "22",
  name: "Shattered Mirror",
  blurb: "A mirror full of night sky that fractures and heals. Shards scatter from your cursor.",
  camera: { fov: 35, position: [0, 0.5, 9.5], target: [0, 0.45, 0] },
  bloom: { strength: 0.75, radius: 0.55, threshold: 0.8 },
  exposure: 1.05,

  setup({ THREE, scene, camera, sky, pointer, rand, palette }) {
    sky({ haze: 0.12, mid: "#0a1733", horizon: "#27457f" });
    const R = rand(22);

    // Jittered grid → triangles → thin extruded shards.
    const W = 2.6, H = 3.3, NX = 8, NY = 11, TH = 0.05;
    const pts = [];
    for (let j = 0; j <= NY; j++) {
      pts.push([]);
      for (let i = 0; i <= NX; i++) {
        const edgeX = i === 0 || i === NX, edgeY = j === 0 || j === NY;
        const jx = edgeX ? 0 : (R() - 0.5) * 0.75, jy = edgeY ? 0 : (R() - 0.5) * 0.75;
        pts[j].push(new THREE.Vector2(((i + jx) / NX - 0.5) * W, ((j + jy) / NY - 0.5) * H));
      }
    }
    const pos = [], nrm = [], cen = [], rnd = [], side = [], bary = [];
    const addTri = (a, b, c) => {
      const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3;
      const d = new THREE.Vector3(R() - 0.5, R() - 0.5, R() * 0.8 + 0.2).normalize();
      const r4 = [d.x, d.y, d.z, R()];
      const push = (p, z, n, s, br) => {
        pos.push(p.x, p.y, z); nrm.push(...n); cen.push(cx, cy, 0); rnd.push(...r4); side.push(s); bary.push(...br);
      };
      const B = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      // front / back
      [a, b, c].forEach((p, k) => push(p, TH / 2, [0, 0, 1], 0, B[k]));
      [a, c, b].forEach((p, k) => push(p, -TH / 2, [0, 0, -1], 0, B[[0, 2, 1][k]]));
      // sides
      [[a, b], [b, c], [c, a]].forEach(([p, q]) => {
        const n = [q.y - p.y, -(q.x - p.x), 0], l = Math.hypot(n[0], n[1]);
        n[0] /= l; n[1] /= l;
        const e = [1, 1, 1];
        push(p, TH / 2, n, 1, e); push(p, -TH / 2, n, 1, e); push(q, TH / 2, n, 1, e);
        push(q, TH / 2, n, 1, e); push(p, -TH / 2, n, 1, e); push(q, -TH / 2, n, 1, e);
      });
    };
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const p00 = pts[j][i], p10 = pts[j][i + 1], p01 = pts[j + 1][i], p11 = pts[j + 1][i + 1];
        if (R() > 0.5) { addTri(p00, p10, p11); addTri(p00, p11, p01); }
        else { addTri(p00, p10, p01); addTri(p10, p11, p01); }
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute("aCenter", new THREE.Float32BufferAttribute(cen, 3));
    geo.setAttribute("aRand", new THREE.Float32BufferAttribute(rnd, 4));
    geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
    geo.setAttribute("aBary", new THREE.Float32BufferAttribute(bary, 3));

    const uniforms = {
      uTime: { value: 0 }, uShatter: { value: 0 }, uCrack: { value: 0 },
      uPtr: { value: new THREE.Vector3(99, 99, 0) },
      uMoon: { value: new THREE.Vector3(-0.35, 0.3, 0.89).normalize() },
      uIce: { value: new THREE.Color(palette.ice) }, uCyan: { value: new THREE.Color(palette.cyan) },
      uViolet: { value: new THREE.Color(palette.violet) }, uNavy: { value: new THREE.Color(palette.navy) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        uniform float uTime, uShatter; uniform vec3 uPtr;
        attribute vec3 aCenter; attribute vec4 aRand; attribute float aSide; attribute vec3 aBary;
        varying vec3 vWP; varying vec3 vN; varying float vSide; varying vec3 vBary; varying float vE;
        mat3 rot(vec3 a, float g){ a=normalize(a); float s=sin(g), c=cos(g), o=1.0-c;
          return mat3(o*a.x*a.x+c, o*a.x*a.y+a.z*s, o*a.z*a.x-a.y*s,
                      o*a.x*a.y-a.z*s, o*a.y*a.y+c, o*a.y*a.z+a.x*s,
                      o*a.z*a.x+a.y*s, o*a.y*a.z-a.x*s, o*a.z*a.z+c); }
        void main(){
          // Burst ripples out from an off-centre impact point.
          float dist = length(aCenter.xy - vec2(0.35, 0.55));
          float e = smoothstep(0.0, 1.0, uShatter * 1.9 - dist * 0.32);
          vec2 away = aCenter.xy - uPtr.xy; float pd = length(away);
          float p = exp(-pd * pd * 3.2) * uPtr.z;
          vec3 dir = aRand.xyz;
          vec3 axis = vec3(dir.y, -dir.x + 0.3, dir.z * 0.5 + aRand.w);
          float ang = e * (0.6 + aRand.w * 1.6) + e * sin(uTime * (0.4 + aRand.w * 0.6) + aRand.w * 6.28) * 0.35 + p * 1.1;
          mat3 m = rot(axis, ang);
          vec3 off = vec3(dir.xy * vec2(0.95, 0.6) + aCenter.xy * vec2(0.3, 0.15), dir.z * 1.1 - 0.4) * e;
          off += e * vec3(sin(uTime * 0.7 + aRand.w * 9.0), cos(uTime * 0.6 + aRand.w * 7.0), 0.0) * 0.12;
          off += vec3(normalize(away + 1e-4) * 0.55, 0.7) * p;
          vec3 lp = m * (position - aCenter) + aCenter + off;
          vec4 wp = modelMatrix * vec4(lp, 1.0);
          vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * (m * normal));
          vSide = aSide; vBary = aBary; vE = max(e, p);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uCrack; uniform vec3 uMoon, uIce, uCyan, uViolet, uNavy;
        varying vec3 vWP; varying vec3 vN; varying float vSide; varying vec3 vBary; varying float vE;
        float h31(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
        vec3 stars(vec3 d){
          vec3 col = vec3(0.0);
          for(int k=0;k<2;k++){
            float sc = k==0 ? 70.0 : 140.0;
            vec3 g = d * sc; vec3 id = floor(g); vec3 f = fract(g) - 0.5;
            float h = h31(id + float(k) * 17.0);
            if(h > 0.9){ float s = smoothstep(0.26, 0.0, length(f)) * (h - 0.9) * 10.0;
              s *= 0.6 + 0.4 * sin(uTime * 2.0 + h * 50.0);
              col += mix(uIce, vec3(1.0), h) * s * (k==0 ? 2.2 : 1.0); }
          }
          return col;
        }
        vec3 nightSky(vec3 d){
          float y = d.y;
          vec3 col = mix(vec3(0.13,0.2,0.38), uNavy * 0.7, smoothstep(-0.05, 0.3, y));
          col = mix(col, vec3(0.01,0.016,0.04), smoothstep(0.2, 0.7, y));
          col += vec3(0.35,0.5,0.8) * exp(-abs(y) * 14.0) * 0.3;
          // faint aurora ribbon
          float band = exp(-pow((y - 0.22 - 0.06 * sin(d.x * 5.0 + uTime * 0.2)) * 9.0, 2.0));
          col += mix(uCyan, uViolet, 0.5 + 0.5 * sin(d.x * 3.0 + uTime * 0.15)) * band * 0.22;
          col += stars(d);
          float m = dot(d, uMoon);
          col += vec3(2.6, 2.8, 3.2) * smoothstep(0.9993, 0.9996, m) + vec3(0.5,0.65,1.0) * pow(max(m,0.0), 180.0) * 0.8;
          return col;
        }
        void main(){
          vec3 N = normalize(vN); vec3 V = normalize(vWP - cameraPosition);
          if(dot(N, V) > 0.0) N = -N;
          vec3 R = reflect(V, N); R = normalize(vec3(R.x, R.y * 0.9 + 0.32, R.z));
          float fr = pow(1.0 - max(dot(-V, N), 0.0), 4.0);
          vec3 col = nightSky(R) * vec3(0.86, 0.92, 1.05) * (0.85 + fr * 0.5);
          // cracks: glowing seams, bright when shattering
          float edge = min(min(vBary.x, vBary.y), vBary.z);
          float seam = smoothstep(0.025, 0.0, edge) * max(uCrack, vE * 0.3);
          col += vec3(1.1, 1.4, 2.0) * seam;
          // glass thickness edges
          col = mix(col, vec3(0.6, 0.85, 1.35) * (0.5 + vE * 0.25), vSide);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const mirror = new THREE.Mesh(geo, mat);
    mirror.position.y = 0.75;
    scene.add(mirror);

    // Soft halo behind the mirror.
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uA: { value: 0.35 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float d=length((vUv-0.5)*vec2(1.25,1.0)); gl_FragColor=vec4(vec3(0.25,0.4,0.85)*exp(-d*d*14.0)*uA,1.0);} `,
      })
    );
    halo.position.set(0, 0.75, -1.5);
    scene.add(halo);

    // Drifting glints.
    const N = 220, dp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) dp.set([(R() - 0.5) * 12, (R() - 0.5) * 7, (R() - 0.5) * 6 - 1], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: new THREE.Color(1.1, 1.3, 1.8), size: 0.025, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
    scene.add(dust);

    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
    const base = camera.position.clone();
    const CYCLE = 11;
    return (t) => {
      const c = (t + 1.5) % CYCLE;
      // whole → cracks → burst → float → heal
      const out = THREE.MathUtils.smoothstep(c, 3.2, 5.0), back = THREE.MathUtils.smoothstep(c, 8.2, 10.4);
      uniforms.uShatter.value = out * (1 - back);
      uniforms.uCrack.value = THREE.MathUtils.smoothstep(c, 2.0, 3.2) * (1 - back) * 0.9;
      uniforms.uTime.value = t;

      camera.position.set(base.x + pointer.x * 0.9, base.y + pointer.y * 0.5, base.z);
      camera.lookAt(0, 0.55, 0);
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        const u = uniforms.uPtr.value;
        u.x = hit.x - mirror.position.x; u.y = hit.y - mirror.position.y;
        u.z = THREE.MathUtils.lerp(u.z, pointer.lengthSq() > 0.0004 ? 1 : 0, 0.05);
      }
      mirror.rotation.y = Math.sin(t * 0.3) * 0.12;
      mirror.rotation.x = Math.sin(t * 0.23) * 0.04;
      dust.rotation.y = t * 0.02;
    };
  },
};
