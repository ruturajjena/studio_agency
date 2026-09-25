// 09 — Crystal Geode: hexagonal quartz erupting from dark rock, lit by a wandering inner light.
export default {
  id: "09",
  name: "Crystal Geode",
  blurb: "A cluster of quartz grows from black rock, glowing from within. Your cursor moves the light inside it.",
  camera: { fov: 36, position: [0, 1.5, 8.2], target: [0, 0.35, 0] },
  bloom: { strength: 0.7, radius: 0.55, threshold: 0.8 },
  exposure: 1.05,

  setup({ THREE, scene, renderer, sky, pointer, palette, glsl, rand, track }) {
    const skyMesh = sky({ top: "#02040a", mid: "#07122a", horizon: "#10244f", haze: 0.08 });

    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const env = new THREE.Scene();
    env.add(skyMesh.clone());
    const strip = (w, h, pos, c) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    strip(30, 5, [-15, 28, 20], new THREE.Color(4, 4.6, 6));
    strip(4, 30, [30, 5, 10], new THREE.Color(0.8, 1.6, 2.6));
    strip(4, 30, [-30, 0, -10], new THREE.Color(1.2, 1, 2.6));
    scene.environment = track(pmrem.fromScene(env, 0.02)).texture;

    const lightPos = new THREE.Vector3(0, 0.6, 0.2);
    const inner = new THREE.PointLight("#8fd8ff", 5, 7, 1.1);
    const rim = new THREE.DirectionalLight(palette.blue, 2.2);
    rim.position.set(-3, 4, -5);
    const fill = new THREE.DirectionalLight(palette.ice, 0.5);
    fill.position.set(4, 2, 5);
    scene.add(inner, rim, fill);

    const cluster = new THREE.Group();
    cluster.position.y = -0.45;
    scene.add(cluster);

    // Rock: noise-displaced, flat-shaded lump.
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x080b14, roughness: 0.75, metalness: 0.25, flatShading: true, envMapIntensity: 0.35 });
    rockMat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader
        .replace("#include <common>", `#include <common>\n${glsl.noise}`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          float n = snoise(position * 1.1) * 0.22 + snoise(position * 3.3) * 0.07 + snoise(position * 7.0) * 0.025;
          transformed += normal * n;`);
    };
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 9), rockMat);
    rock.scale.set(1.15, 0.6, 0.95);
    rock.position.y = -0.55;
    cluster.add(rock);

    // Crystal: hexagonal prism with a pyramidal termination.
    const crystalGeo = (radius, len) => {
      const tip = radius * 1.7;
      const g = new THREE.LatheGeometry(
        [new THREE.Vector2(0.001, -0.3), new THREE.Vector2(radius, -0.3), new THREE.Vector2(radius * 1.02, len - tip), new THREE.Vector2(0.001, len)],
        6
      ).toNonIndexed();
      g.computeVertexNormals();
      const p = g.attributes.position, h = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) h[i] = (p.getY(i) + 0.3) / (len + 0.3);
      g.setAttribute("aH", new THREE.BufferAttribute(h, 1));
      return g;
    };
    const uniforms = { uLight: { value: lightPos }, uTime: { value: 0 } };
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e1a36, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02,
      flatShading: true, envMapIntensity: 1.6,
    });
    crystalMat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aH; varying float vH; varying vec3 vWP;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvH = aH; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", `#include <common>\nuniform vec3 uLight; uniform float uTime; varying float vH; varying vec3 vWP;\n${glsl.noise}`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float d = distance(vWP, uLight);
          float inner = 0.85 / (1.0 + d * d * 2.5);
          float veil = 0.6 + 0.5 * snoise(vWP * 3.5 + vec3(0.0, uTime * 0.1, 0.0));
          vec3 cold = mix(vec3(0.05, 0.1, 0.32), vec3(0.4, 0.85, 1.3), clamp(inner, 0.0, 1.0));
          float fr = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.5);
          totalEmissiveRadiance += cold * (inner * veil * (0.3 + 0.7 * vH) + 0.08) + vec3(0.5, 0.7, 1.2) * fr * 0.35 + vec3(0.9, 1.0, 1.2) * pow(vH, 14.0) * 0.5;`);
    };

    const R = rand(9);
    const up = new THREE.Vector3(0, 1, 0);
    const makeCrystal = (base, dir, radius, len) => {
      const m = new THREE.Mesh(crystalGeo(radius, len), crystalMat);
      m.quaternion.setFromUnitVectors(up, dir.normalize());
      m.rotateY(R() * Math.PI);
      m.position.copy(base);
      cluster.add(m);
    };
    // Rock top surface (ellipsoid) so crystals root on it.
    const RX = 1.7 * 1.15, RY = 1.7 * 0.6, RZ = 1.7 * 0.95, RYo = -0.55;
    const surf = (x, z) => RYo + RY * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2 - (z / RZ) ** 2)) - 0.12;
    const focus = new THREE.Vector3(0, -1.8, 0);
    makeCrystal(new THREE.Vector3(0, surf(0, 0) - 0.1, 0), new THREE.Vector3(0.04, 1, 0.06), 0.3, 2.5);
    makeCrystal(new THREE.Vector3(-0.3, surf(-0.3, 0.1) - 0.05, 0.1), new THREE.Vector3(-0.38, 1, 0.12), 0.22, 1.9);
    makeCrystal(new THREE.Vector3(0.32, surf(0.32, -0.1) - 0.05, -0.1), new THREE.Vector3(0.42, 1, -0.05), 0.2, 1.65);
    for (let i = 0; i < 34; i++) {
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 1.25;
      const x = Math.cos(a) * rr * 1.1, z = Math.sin(a) * rr * 0.8 + 0.1;
      const base = new THREE.Vector3(x, surf(x, z), z);
      const dir = base.clone().sub(focus).normalize().add(new THREE.Vector3((R() - 0.5) * 0.5, 0, (R() - 0.5) * 0.5));
      const len = (1.35 - rr * 0.6) * (0.45 + R() * 0.75);
      makeCrystal(base, dir, 0.05 + (0.04 + R() * 0.08) * len, Math.max(0.3, len));
    }

    // The light itself: a small hot glow nestled among the crystals.
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const g = cv.getContext("2d");
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.2, "rgba(150,220,255,0.5)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(1.4, 1.8, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    orb.scale.setScalar(0.7);
    scene.add(orb);

    // Motes drifting in the light.
    const n = 260, mp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) mp.set([(R() - 0.5) * 7, (R() - 0.3) * 4, (R() - 0.5) * 4], i * 3);
    const mg = new THREE.BufferGeometry();
    mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: palette.ice, size: 0.025, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(motes);

    return (t) => {
      uniforms.uTime.value = t;
      lightPos.set(pointer.x * 1.4 + Math.sin(t * 0.7) * 0.15, 0.55 + pointer.y * 0.8 + Math.sin(t * 0.9) * 0.1, 0.35 + Math.cos(t * 0.5) * 0.2);
      inner.position.copy(lightPos);
      inner.intensity = 5 * (0.9 + 0.1 * Math.sin(t * 3.1));
      orb.position.copy(lightPos);
      cluster.rotation.y = Math.sin(t * 0.15) * 0.35 + pointer.x * 0.25;
      motes.rotation.y = t * 0.03;
      motes.position.y = Math.sin(t * 0.2) * 0.1;
    };
  },
};
