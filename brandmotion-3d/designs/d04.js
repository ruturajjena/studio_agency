// 04 — Glass Prism: a beam of white light refracts through glass and fans into a blue spectrum.
export default {
  id: "04",
  name: "Glass Prism",
  blurb: "White light enters a glass prism and fans out into a cold spectrum. Your cursor steers the beam.",
  theme: "prism",
  camera: { fov: 36, position: [1.4, 1.1, 10], target: [0.6, 0.15, 0] },
  bloom: { strength: 0.8, radius: 0.55, threshold: 0.8 },
  exposure: 1.0,

  setup({ THREE, scene, renderer, sky, pointer, palette, track }) {
    const skyMesh = sky({ haze: 0.12, horizon: "#15295a", mid: "#0a1733", top: "#02050c", below: "#030712" });

    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const env = new THREE.Scene();
    env.add(skyMesh.clone());
    const strip = (w, h, pos, c) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    strip(6, 40, [-30, 10, 25], new THREE.Color(5, 6, 8));
    strip(40, 3, [10, 30, -10], new THREE.Color(2, 2.6, 4));
    strip(3, 30, [30, -5, 20], new THREE.Color(1, 1.6, 3));
    scene.environment = track(pmrem.fromScene(env, 0.02, 0.1, 500)).texture;

    // Prism: equilateral cross-section in the XY plane, apex up.
    const Rc = 1.45, depth = 1.8, P = new THREE.Vector2(-0.9, 0.45);
    const prismGeo = new THREE.CylinderGeometry(Rc, Rc, depth, 3, 1);
    prismGeo.rotateX(-Math.PI / 2);
    const prism = new THREE.Mesh(
      prismGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transmission: 1, thickness: 1.6, roughness: 0.03, ior: 1.5, dispersion: 0.4,
        attenuationColor: new THREE.Color(palette.ice), attenuationDistance: 4, specularIntensity: 1, envMapIntensity: 1.3, flatShading: true,
      })
    );
    prism.position.set(P.x, P.y, 0);
    scene.add(prism);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(prismGeo), new THREE.LineBasicMaterial({ color: new THREE.Color(1.4, 1.6, 2.2), transparent: true, opacity: 0.7, depthTest: false, toneMapped: false }));
    prism.add(edges);
    // Fresnel sheen so the glass body reads against the night.
    const sheen = new THREE.Mesh(prismGeo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.0);
        gl_FragColor=vec4(vec3(0.25,0.4,0.75)*(0.12+f*0.6),1.0);}`,
    }));
    prism.add(sheen);

    const tri = [
      new THREE.Vector2(0, Rc), new THREE.Vector2(-Rc * 0.866, -Rc * 0.5), new THREE.Vector2(Rc * 0.866, -Rc * 0.5),
    ].map((v) => v.add(P));
    const faces = [[0, 1], [0, 2], [1, 2]].map(([i, j]) => {
      const a = tri[i], b = tri[j];
      const n = new THREE.Vector2(b.y - a.y, a.x - b.x).normalize();
      const mid = a.clone().add(b).multiplyScalar(0.5);
      if (n.dot(mid.clone().sub(P)) < 0) n.negate();
      return { a, b, n };
    });

    // Soft beam quad: positioned between two points each frame.
    const beamMat = (color, fadeIn, fadeOut) =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: color }, uIn: { value: fadeIn }, uOut: { value: fadeOut }, uTime: { value: 0 } },
        transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform vec3 uColor; uniform float uIn,uOut,uTime; varying vec2 vUv;
          void main(){ float x=abs(vUv.y-0.5)*2.0;
            float i=exp(-x*x*7.0)*0.3+exp(-x*x*70.0);
            float along=smoothstep(0.0,uIn+1e-4,vUv.x)*pow(1.0-vUv.x,uOut);
            float shimmer=0.9+0.1*sin(vUv.x*80.0-uTime*6.0);
            gl_FragColor=vec4(uColor*i*along*shimmer,1.0);}`,
      });
    const beams = [];
    const makeBeam = (color, width, fadeIn, fadeOut) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), beamMat(color, fadeIn, fadeOut));
      m.userData.width = width;
      m.frustumCulled = false;
      scene.add(m);
      beams.push(m);
      return m;
    };
    const place = (m, a, b) => {
      const d = b.clone().sub(a);
      m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
      m.rotation.z = Math.atan2(d.y, d.x);
      m.scale.set(d.length(), m.userData.width, 1);
    };

    const spectrum = ["#8a5cff", "#6f6cff", "#4f7dff", "#3f9bff", "#5cc4ff", "#6fe3ff", "#9ff5ff"].map((h) => new THREE.Color(h).multiplyScalar(2.4));
    const iors = spectrum.map((_, i) => 1.62 - (i / (spectrum.length - 1)) * 0.17);
    const incoming = makeBeam(new THREE.Color(3.2, 3.4, 3.8), 0.09, 0.5, 0.0);
    const inner = spectrum.map((c) => makeBeam(c.clone().multiplyScalar(0.35), 0.16, 0.0, 0.0));
    const outer = spectrum.map((c) => makeBeam(c, 0.2, 0.0, 1.3));

    // Glints where light meets glass.
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const g = cv.getContext("2d");
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(200,220,255,0.35)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const glintTex = new THREE.CanvasTexture(cv);
    const glint = (s, c) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, color: c, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
      sp.scale.setScalar(s);
      scene.add(sp);
      return sp;
    };
    const gIn = glint(0.9, new THREE.Color(2.5, 2.7, 3));
    const gOut = glint(1.1, new THREE.Color(1.2, 1.6, 2.6));

    // Snell refraction in 2D. n points against the incoming direction.
    const refract = (I, n, eta) => {
      const cosi = -n.dot(I);
      const k = 1 - eta * eta * (1 - cosi * cosi);
      if (k < 0) return null;
      return I.clone().multiplyScalar(eta).add(n.clone().multiplyScalar(eta * cosi - Math.sqrt(k))).normalize();
    };
    const hitFace = (o, d, skip) => {
      let best = null;
      faces.forEach((f, i) => {
        if (i === skip) return;
        const e = f.b.clone().sub(f.a);
        const den = d.x * e.y - d.y * e.x;
        if (Math.abs(den) < 1e-6) return;
        const w = f.a.clone().sub(o);
        const t = (w.x * e.y - w.y * e.x) / den;
        const u = (w.x * d.y - w.y * d.x) / den;
        if (t > 1e-4 && u >= 0 && u <= 1 && (!best || t < best.t)) best = { t, i, p: o.clone().add(d.clone().multiplyScalar(t)) };
      });
      return best;
    };

    // Floating dust that catches the light.
    const dn = 500, dp = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) dp.set([(Math.random() - 0.3) * 14, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: palette.ice, size: 0.02, transparent: true, opacity: 0.5, depthWrite: false }));
    scene.add(dust);

    const entry = faces[0].a.clone().lerp(faces[0].b, 0.5);
    return (t) => {
      beams.forEach((b) => (b.material.uniforms.uTime.value = t));
      const ang = THREE.MathUtils.degToRad(21 + pointer.y * 13 - pointer.x * 4 + Math.sin(t * 0.45) * 3);
      const I = new THREE.Vector2(Math.cos(ang), Math.sin(ang));
      place(incoming, entry.clone().sub(I.clone().multiplyScalar(14)), entry);
      gIn.position.set(entry.x, entry.y, 0.05);
      const exitAvg = new THREE.Vector2();
      let exits = 0;
      spectrum.forEach((_, k) => {
        const T = refract(I, faces[0].n, 1 / iors[k]);
        const h = T && hitFace(entry, T, 0);
        const O = h && refract(T, faces[h.i].n.clone().negate(), iors[k]);
        inner[k].visible = outer[k].visible = !!O;
        if (!O) return;
        place(inner[k], entry, h.p);
        place(outer[k], h.p, h.p.clone().add(O.multiplyScalar(11)));
        exitAvg.add(h.p);
        exits++;
      });
      if (exits) gOut.position.set(exitAvg.x / exits, exitAvg.y / exits, 0.05);
      prism.rotation.y = pointer.x * 0.08;
      dust.rotation.y = t * 0.01;
    };
  },
};
