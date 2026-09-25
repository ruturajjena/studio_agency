// 08 — Field Lines: a magnetic dipole drawn in light, with charge streaming along its loops.
export default {
  id: "08",
  name: "Field Lines",
  blurb: "A magnetic dipole traced in light, with particles streaming along its field loops. Your cursor swings the axis.",
  theme: "aurora",
  camera: { fov: 38, position: [0, 0.6, 12], target: [0, -0.1, 0] },
  bloom: { strength: 0.85, radius: 0.55, threshold: 0.72 },
  exposure: 1.0,

  setup({ THREE, scene, renderer, sky, pointer, palette, rand, onResize, track }) {
    const skyMesh = sky({ top: "#02040b", mid: "#081530", horizon: "#0c1d44", haze: 0.06 });

    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const env = new THREE.Scene();
    env.add(skyMesh.clone());
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.5, 5), side: THREE.DoubleSide }));
    panel.position.set(-10, 25, 25);
    panel.lookAt(0, 0, 0);
    env.add(panel);
    scene.environment = track(pmrem.fromScene(env, 0.02)).texture;

    const axis = new THREE.Group(); // tilted by the cursor
    const spin = new THREE.Group(); // slow spin about the dipole axis
    axis.position.y = 0.6;
    axis.scale.setScalar(0.88);
    scene.add(axis);
    axis.add(spin);

    const CORE = 0.62;
    const SHELLS = [1.35, 2.0, 2.9, 4.1];
    const AZ = 10;
    const fieldPoint = (L, phi, s, out) => {
      const th0 = Math.asin(Math.sqrt(CORE / L));
      const th = th0 + (Math.PI - 2 * th0) * s;
      const r = L * Math.sin(th) ** 2;
      return out.set(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi));
    };

    // Field-line tubes: bright near the poles, with pulses travelling outward.
    const lineMat = (color, base) =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: color }, uBase: { value: base } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        vertexShader: `varying float vS; void main(){ vS=uv.x; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime,uBase; uniform vec3 uColor; varying float vS;
          void main(){ float pole=pow(abs(vS*2.0-1.0),6.0);
            float pulse=pow(0.5+0.5*sin(vS*28.0-uTime*3.0),12.0);
            gl_FragColor=vec4(uColor*(uBase+pole*0.35+pulse*0.5),1.0);}`,
      });
    const mats = [];
    const tmp = new THREE.Vector3();
    SHELLS.forEach((L, si) => {
      const tint = new THREE.Color(si === 3 ? palette.violet : si === 0 ? palette.cyan : palette.ice).multiplyScalar(si === 0 ? 1.1 : 1.3);
      const mat = lineMat(tint, 0.35 - si * 0.05);
      mats.push(mat);
      for (let k = 0; k < AZ; k++) {
        const phi = (k / AZ) * Math.PI * 2 + si * 0.3;
        const pts = [];
        for (let j = 0; j <= 80; j++) pts.push(fieldPoint(L, phi, j / 80, tmp).clone());
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.007 + (3 - si) * 0.002, 5), mat);
        spin.add(tube);
      }
    });

    // Charge streaming along the lines (positions solved in the shader).
    const R = rand(8), n = 5000;
    const attr = new Float32Array(n * 4); // L, phi, offset, speed
    for (let i = 0; i < n; i++) {
      const si = Math.floor(R() * SHELLS.length);
      const onLine = R() < 0.8;
      const L = onLine ? SHELLS[si] : 1.2 + R() * 3.2;
      const phi = onLine ? (Math.floor(R() * AZ) / AZ) * Math.PI * 2 + si * 0.3 + (R() - 0.5) * 0.04 : R() * Math.PI * 2;
      attr.set([L, phi, R(), (0.08 + R() * 0.08) * (onLine ? 1 : 0.6)], i * 4);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    pg.setAttribute("aP", new THREE.BufferAttribute(attr, 4));
    pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);
    const pu = { uTime: { value: 0 }, uScale: { value: 600 }, uCore: { value: CORE } };
    const particles = new THREE.Points(
      pg,
      new THREE.ShaderMaterial({
        uniforms: pu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uTime, uScale, uCore; attribute vec4 aP; varying float vS; varying float vA;
          void main(){
            float L = aP.x, phi = aP.y;
            float s = fract(aP.z + uTime * aP.w * 2.0 / L);
            float th0 = asin(sqrt(uCore / L));
            float th = th0 + (3.14159265 - 2.0 * th0) * s;
            float r = L * pow(sin(th), 2.0);
            vec3 p = r * vec3(sin(th) * cos(phi), cos(th), sin(th) * sin(phi));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            vS = s;
            vA = smoothstep(0.0, 0.12, s) * smoothstep(1.0, 0.88, s);
            gl_PointSize = uScale * 0.035 / -mv.z * (0.6 + 0.8 * fract(aP.z * 13.0));
          }`,
        fragmentShader: /* glsl */ `
          varying float vS; varying float vA;
          void main(){ vec2 q = gl_PointCoord - 0.5; float d = dot(q, q) * 4.0;
            float a = exp(-d * 5.0) * vA;
            vec3 c = mix(vec3(0.45, 0.9, 1.1), vec3(1.0, 1.05, 1.2), vS);
            gl_FragColor = vec4(c * a * 1.8, 1.0); }`,
      })
    );
    spin.add(particles);
    onResize((s) => (pu.uScale.value = s.height * renderer.getPixelRatio()));

    // Core: glossy dark sphere with a luminous rim.
    const coreMat = new THREE.MeshPhysicalMaterial({ color: 0x03050b, metalness: 0.5, roughness: 0.18, clearcoat: 1, envMapIntensity: 1.4 });
    coreMat.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
         totalEmissiveRadiance += vec3(0.35, 0.75, 1.2) * fr * 0.9;`
      );
    };
    const core = new THREE.Mesh(new THREE.SphereGeometry(CORE * 0.92, 64, 48), coreMat);
    spin.add(core);
    const band = new THREE.Mesh(new THREE.TorusGeometry(CORE * 0.93, 0.006, 8, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 2.2, 2.8), toneMapped: false }));
    band.rotation.x = Math.PI / 2;
    spin.add(band);
    [1, -1].forEach((sgn) => {
      const pole = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.4, 4), toneMapped: false }));
      pole.position.y = sgn * CORE * 0.93;
      spin.add(pole);
    });

    return (t) => {
      mats.forEach((m) => (m.uniforms.uTime.value = t));
      pu.uTime.value = t;
      spin.rotation.y = t * 0.12;
      axis.rotation.z = 0.35 - pointer.x * 0.9 + Math.sin(t * 0.25) * 0.08;
      axis.rotation.x = 0.25 + pointer.y * 0.7;
    };
  },
};
