// 35 — Card Cascade: a hand of glass portfolio cards that fans open and cycles in a looping cascade.
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export default {
  id: "35",
  name: "Card Cascade",
  blurb: "A deck of glass portfolio cards cascading through a slow shuffle. Move the cursor to fan them out.",
  camera: { fov: 36, position: [0, 0.4, 9.5], target: [0, 0.55, 0] },
  bloom: { strength: 0.55, radius: 0.6, threshold: 0.85 },
  exposure: 1.0,

  setup({ THREE, scene, renderer, sky, pointer, rand, track }) {
    const r = rand(35);
    const skyMesh = sky({ haze: 0.2, horizon: "#243f78", mid: "#0a1636" });
    scene.remove(skyMesh);
    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const envScene = new THREE.Scene();
    envScene.add(skyMesh);
    const strip = (w, h, x, y, z, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 1.1, k * 1.35), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    };
    strip(10, 40, -30, 10, 30, 2.4);
    strip(40, 6, 20, 30, 20, 1.6);
    const envRT = track(pmrem.fromScene(envScene, 0.03));
    scene.environment = envRT.texture;

    // Procedural card faces: gradient field, glow orb, fine grid and "type" bars.
    const hues = [["#0b1b45", "#3a67d8", "#9fc0ff"], ["#0a1433", "#5a4de0", "#b9b0ff"], ["#07182c", "#1f8fb8", "#8ff0ff"], ["#0e1a3d", "#2c55a8", "#dce8ff"]];
    const face = (i) => {
      const W = 256, H = 356, c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d");
      const [a, b, hi] = hues[i % hues.length];
      const rr = (x, y, w, h, rad) => { g.beginPath(); g.roundRect(x, y, w, h, rad); };
      rr(0, 0, W, H, 18); g.clip();
      const lg = g.createLinearGradient(0, 0, W * (0.3 + r() * 0.7), H);
      lg.addColorStop(0, a); lg.addColorStop(1, b);
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
      const ox = W * (0.2 + r() * 0.6), oy = H * (0.2 + r() * 0.35), orad = 60 + r() * 90;
      const rg = g.createRadialGradient(ox, oy, 0, ox, oy, orad);
      rg.addColorStop(0, hi); rg.addColorStop(0.35, hi + "88"); rg.addColorStop(1, hi + "00");
      g.globalCompositeOperation = "lighter"; g.fillStyle = rg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "source-over";
      g.strokeStyle = "rgba(220,232,255,0.07)"; g.lineWidth = 1;
      for (let x = 16; x < W; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      const shape = i % 3;
      g.strokeStyle = "rgba(230,240,255,0.55)"; g.lineWidth = 2;
      g.beginPath();
      if (shape === 0) g.arc(W / 2, H * 0.38, 46, 0, Math.PI * 2);
      else if (shape === 1) g.rect(W / 2 - 40, H * 0.38 - 40, 80, 80);
      else { g.moveTo(W / 2, H * 0.38 - 50); g.lineTo(W / 2 + 46, H * 0.38 + 30); g.lineTo(W / 2 - 46, H * 0.38 + 30); g.closePath(); }
      g.stroke();
      g.fillStyle = "rgba(4,9,20,0.45)"; g.fillRect(0, H * 0.72, W, H * 0.28);
      g.fillStyle = "rgba(235,242,255,0.9)"; g.fillRect(20, H * 0.77, 110 + r() * 60, 11);
      g.fillStyle = "rgba(200,215,245,0.45)"; g.fillRect(20, H * 0.83, 150 + r() * 50, 6); g.fillRect(20, H * 0.87, 90 + r() * 60, 6);
      g.fillStyle = hi; g.beginPath(); g.arc(W - 30, H * 0.79, 7, 0, Math.PI * 2); g.fill();
      rr(1, 1, W - 2, H - 2, 18); g.strokeStyle = "rgba(220,232,255,0.5)"; g.lineWidth = 2; g.stroke();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    };

    const N = 12, CW = 1.7, CH = 2.36;
    const glassGeo = new RoundedBoxGeometry(CW, CH, 0.05, 4, 0.07);
    const faceGeo = new THREE.PlaneGeometry(CW - 0.04, CH - 0.04);
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1a2c55, metalness: 0.1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 1.6, depthWrite: false });
    // Shared card back: dark field, fine border and a ring mark.
    const bc = document.createElement("canvas");
    bc.width = 256; bc.height = 356;
    const bg = bc.getContext("2d");
    const blg = bg.createLinearGradient(0, 0, 256, 356);
    blg.addColorStop(0, "#0c1a3d"); blg.addColorStop(1, "#050b1c");
    bg.fillStyle = blg; bg.fillRect(0, 0, 256, 356);
    bg.strokeStyle = "rgba(159,192,255,0.35)"; bg.lineWidth = 1.5;
    bg.beginPath(); bg.roundRect(12, 12, 232, 332, 12); bg.stroke();
    bg.strokeStyle = "rgba(220,232,255,0.7)"; bg.lineWidth = 3;
    bg.beginPath(); bg.arc(128, 178, 34, 0, Math.PI * 2); bg.stroke();
    bg.beginPath(); bg.arc(128, 178, 12, 0, Math.PI * 2); bg.fillStyle = "rgba(159,192,255,0.8)"; bg.fill();
    const backTex = new THREE.CanvasTexture(bc);
    backTex.colorSpace = THREE.SRGBColorSpace;
    const backMat = new THREE.MeshBasicMaterial({ map: backTex });

    const deck = new THREE.Group();
    scene.add(deck);
    const cards = [];
    for (let i = 0; i < N; i++) {
      const card = new THREE.Group();
      const map = face(i);
      const front = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1.05, 1.05, 1.1) }));
      front.position.z = 0.012;
      const back = new THREE.Mesh(faceGeo, backMat);
      back.rotation.y = Math.PI; back.position.z = -0.012;
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.renderOrder = 2;
      card.add(front, back, glass);
      deck.add(card);
      cards.push({ card, glow: 0, mat: front.material });
    }

    // Soft floor glow + backdrop.
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.ShaderMaterial({
      depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; void main(){ vec2 p = (vUv - 0.5) * vec2(1.6, 1.0); float g = exp(-dot(p, p) * 9.0); gl_FragColor = vec4(vec3(0.02, 0.045, 0.12) * g, 1.0); }",
    }));
    halo.position.set(0, 0.6, -4);
    scene.add(halo);

    const PIV = new THREE.Vector3(0, -2.7, 0), RAD = 3.9;
    const ease = (x) => x * x * (3 - 2 * x);
    let fan = 0, phase = 0;
    return (t, dt) => {
      const open = Math.min(1, Math.hypot(pointer.x, pointer.y * 0.6) * 1.4);
      fan += (open - fan) * Math.min(dt * 3, 1);
      const spread = 0.07 + 0.075 * fan;
      phase += dt * 0.32;
      const hoverA = -pointer.x * spread * N * 0.55;
      deck.rotation.set(-0.12 + pointer.y * 0.18, pointer.x * 0.3, 0);
      deck.position.y = Math.sin(t * 0.6) * 0.05;

      for (let i = 0; i < N; i++) {
        const c = cards[i];
        const s = (i + phase) % N; // slot: 0 = leftmost/back … N-1 = rightmost/front
        const angAt = (k) => -(k - (N - 1) / 2) * spread;
        let ang, rad = RAD, z, flip = 0, lift = 0;
        if (s < N - 1) {
          ang = angAt(s);
          z = s * 0.07;
        } else {
          // Cascade: the front card arcs up and over, back to the rear of the fan.
          const u = ease(s - (N - 1));
          ang = angAt(N - 1) + (angAt(0) - angAt(N - 1)) * u;
          rad += Math.sin(Math.PI * u) * 1.1;
          z = (N - 1) * 0.07 * (1 - u) - Math.sin(Math.PI * u) * 1.2;
          flip = u * Math.PI * 2;
        }
        const near = Math.exp(-(((ang - hoverA) / (spread * 1.3)) ** 2)) * fan;
        c.glow += (near - c.glow) * Math.min(dt * 6, 1);
        lift = c.glow * 0.45;
        const rr = rad + lift;
        c.card.position.set(PIV.x - Math.sin(ang) * rr, PIV.y + Math.cos(ang) * rr, z + c.glow * 0.5);
        c.mat.color.setScalar(1 + c.glow * 0.4);
        c.card.rotation.set(0, flip + c.glow * 0.15 * Math.sign(-ang || 1), ang);
      }
    };
  },
};
