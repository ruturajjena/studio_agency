// 29 — Radial Spectrum: a ring of equaliser bars pumping to a procedural beat over a mirror floor.
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

export default {
  id: "29",
  name: "Radial Spectrum",
  blurb: "A circular equaliser pumping to a silent beat on black glass. Bars rise to meet your cursor.",
  camera: { fov: 38, position: [0, 3.3, 11.5], target: [0, 0.05, 0] },
  bloom: { strength: 0.65, radius: 0.35, threshold: 0.85 },
  exposure: 1.0,

  setup({ THREE, scene, camera, sky, pointer, palette, track }) {
    sky({ top: "#02050d", mid: "#08132b", horizon: "#1b3264", haze: 0.15 });
    const N = 96, RAD = 2.6;
    const glow = new THREE.Color(palette.glow), ice = new THREE.Color(palette.ice), cyan = new THREE.Color(palette.cyan), violet = new THREE.Color(palette.violet);

    // Bars: unit-height boxes, darker at the base, bright at the tip.
    const barGeo = new THREE.BoxGeometry(0.22, 1, 0.075).translate(0, 0.5, 0);
    const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    barMat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying float vY;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvY = position.y;");
      s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vY;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= mix(0.12, 1.0, pow(vY, 1.6));");
    };
    const bars = new THREE.InstancedMesh(barGeo, barMat, N);
    const peaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.03, 0.075), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.75, 2.3), toneMapped: false }), N);
    const ring = new THREE.Group();
    ring.add(bars, peaks);
    scene.add(ring);

    // Inner pulse ring.
    const pulseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1.2, 1.8), toneMapped: false, transparent: true });
    const pulse = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.012, 8, 160), pulseMat);
    pulse.rotation.x = Math.PI / 2;
    pulse.position.y = 0.02;
    scene.add(pulse);

    // Mirror floor + dark glaze on top for a glossy falloff.
    const mirror = new Reflector(new THREE.CircleGeometry(120, 64), {
      textureWidth: 1024, textureHeight: 1024, color: 0x4a5266, multisample: 0,
    });
    mirror.rotation.x = -Math.PI / 2;
    scene.add(mirror);
    track({ dispose: () => mirror.dispose() });
    const glaze = new THREE.Mesh(
      new THREE.CircleGeometry(120, 64),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `varying vec3 vW; void main(){ float r=length(vW.xz);
          float lines = smoothstep(0.02, 0.0, abs(fract(r*0.5)-0.5)*2.0 - 0.98) * exp(-r*0.18) * 0.08;
          float a = mix(0.62, 1.0, smoothstep(3.0, 14.0, r));
          gl_FragColor = vec4(vec3(0.005,0.01,0.024) + vec3(0.3,0.45,0.8)*lines, a); }`,
      })
    );
    glaze.rotation.x = -Math.PI / 2;
    glaze.position.y = 0.003;
    scene.add(glaze);

    // Per-bar colour: mostly white-blue, cyan and violet accents on opposite arcs.
    const base = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const c = ice.clone().lerp(glow, 0.5);
      c.lerp(cyan, Math.pow(Math.max(0, Math.cos(a - 0.6)), 6) * 0.8);
      c.lerp(violet, Math.pow(Math.max(0, Math.cos(a - 3.7)), 6) * 0.85);
      base.push(c);
    }

    const heights = new Float32Array(N), peakH = new Float32Array(N), peakV = new Float32Array(N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const col = new THREE.Color();
    const ray = new THREE.Raycaster(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), local = new THREE.Vector3();
    const hash = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };

    return (t, dt) => {
      // Procedural track: kick on the beat, snare on 2 & 4, hats on eighths, drifting melody.
      const beat = t * 2.0, bi = Math.floor(beat), bf = beat - bi;
      const kick = Math.exp(-bf * 7);
      const snare = bi % 2 === 1 ? Math.exp(-bf * 9) : 0;
      const hat = Math.exp(-((beat * 2) % 1) * 14) * 0.8;
      const bar = Math.floor(t / 8);

      ray.setFromCamera(pointer, camera);
      const hasHit = ray.ray.intersectPlane(floorPlane, hit);
      if (hasHit) local.copy(hit).applyAxisAngle(Y, -ring.rotation.y);

      for (let i = 0; i < N; i++) {
        const f = i < N / 2 ? i / (N / 2) : (N - i) / (N / 2); // mirrored spectrum
        const mel = 0.5 + 0.5 * Math.sin(f * 11 + t * 1.3 + Math.sin(t * 0.37 + bar) * 3);
        let h = 0.12
          + kick * Math.pow(1 - f, 3) * 2.4
          + snare * Math.exp(-((f - 0.45) ** 2) / 0.02) * 1.3
          + hat * Math.pow(f, 2) * 0.9
          + mel * mel * (0.25 + 0.35 * Math.sin(f * 3.1)) * (0.6 + 0.4 * hash(i + bi))
          + hash(i * 3.7 + Math.floor(t * 12)) * 0.12;
        const a = (i / N) * Math.PI * 2;
        const x = Math.cos(a) * RAD, z = Math.sin(a) * RAD;
        if (hasHit) {
          const d2 = (x - local.x) ** 2 + (z - local.z) ** 2;
          h += Math.exp(-d2 * 0.9) * 1.8 * Math.min(1, pointer.length() * 4 + 0.2);
        }
        // Fast attack, slow release.
        heights[i] += (h - heights[i]) * (h > heights[i] ? 0.55 : 0.12);
        const H = Math.max(heights[i], 0.04);
        if (H > peakH[i]) { peakH[i] = H; peakV[i] = 0; } else { peakV[i] += dt * 2.2; peakH[i] = Math.max(H, peakH[i] - peakV[i] * dt); }

        q.setFromAxisAngle(Y, -a);
        m4.compose(p.set(x, 0, z), q, sc.set(1, H, 1));
        bars.setMatrixAt(i, m4);
        m4.compose(p.set(x, peakH[i] + 0.08, z), q, sc.set(1, 1, 1));
        peaks.setMatrixAt(i, m4);
        col.copy(base[i]).multiplyScalar(0.3 + H * 0.55);
        bars.setColorAt(i, col);
      }
      bars.instanceMatrix.needsUpdate = true;
      bars.instanceColor.needsUpdate = true;
      peaks.instanceMatrix.needsUpdate = true;

      ring.rotation.y = t * 0.06;
      pulse.scale.setScalar(1 + kick * 0.05);
      pulseMat.opacity = 0.25 + kick * 0.75;
      camera.position.set(Math.sin(pointer.x * 0.35) * 11.5, 3.3 + pointer.y * 1.2, Math.cos(pointer.x * 0.35) * 11.5);
      camera.lookAt(0, 0.05, 0);
    };
  },
};
