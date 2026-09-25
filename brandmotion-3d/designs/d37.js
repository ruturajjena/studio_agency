// 37 — Geodesic Lattice: a geodesic sphere of struts and nodes lit by travelling waves of light.
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export default {
  id: "37",
  name: "Geodesic Lattice",
  blurb: "A geodesic sphere whose struts carry travelling pulses of light. Nodes near your cursor ignite.",
  camera: { fov: 38, position: [0, 0.2, 8.2], target: [0, 0.35, 0] },
  bloom: { strength: 0.75, radius: 0.5, threshold: 0.72 },
  exposure: 1.0,

  setup({ THREE, scene, camera, pointer, rand }) {
    const r = rand(37);
    const R = 1.7;
    const group = new THREE.Group();
    group.position.y = 0.62;
    scene.add(group);

    // Unique nodes and edges of a frequency-5 geodesic sphere.
    let ico = new THREE.IcosahedronGeometry(R, 4);
    ico.deleteAttribute("normal"); ico.deleteAttribute("uv");
    ico = mergeVertices(ico, 1e-4);
    const P = ico.attributes.position, idx = ico.index.array;
    const nodes = [];
    for (let i = 0; i < P.count; i++) nodes.push(new THREE.Vector3().fromBufferAttribute(P, i));
    const edgeSet = new Set(), edges = [];
    for (let f = 0; f < idx.length; f += 3) {
      for (const [a, b] of [[idx[f], idx[f + 1]], [idx[f + 1], idx[f + 2]], [idx[f + 2], idx[f]]]) {
        const k = a < b ? a * 10000 + b : b * 10000 + a;
        if (!edgeSet.has(k)) { edgeSet.add(k); edges.push([a, b]); }
      }
    }

    const pulses = Array.from({ length: 4 }, () => new THREE.Vector4(0, 1, 0, -99));
    const U = { uTime: { value: 0 }, uP: { value: new THREE.Vector3(0, 0, 1) }, uPulse: { value: pulses } };
    const light = /* glsl */ `
      uniform float uTime; uniform vec3 uP; uniform vec4 uPulse[4];
      float lightAt(vec3 d, out float pulseOut){
        vec3 ax = normalize(vec3(sin(uTime * 0.13), 0.7, cos(uTime * 0.11)));
        float band = pow(0.5 + 0.5 * sin(dot(d, ax) * 7.0 - uTime * 1.8), 24.0);
        float pulse = 0.0;
        for (int i = 0; i < 4; i++) {
          float age = uTime - uPulse[i].w;
          float ang = acos(clamp(dot(d, uPulse[i].xyz), -1.0, 1.0));
          pulse += exp(-pow((ang - age * 1.15) * 7.0, 2.0)) * exp(-age * 0.55) * step(0.0, age);
        }
        float pp = exp(-pow(acos(clamp(dot(d, uP), -1.0, 1.0)) * 5.5, 2.0));
        pulseOut = pulse;
        return band * 0.4 + pulse * 1.1 + pp * 1.8;
      }`;
    const mat = (kind) => new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aDir; varying float vI; varying float vPulse; varying float vFace;
        ${light}
        void main(){
          vI = lightAt(normalize(aDir), vPulse);
          vFace = smoothstep(-0.7, 0.6, (normalMatrix * normalize(aDir)).z);
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying float vI; varying float vPulse; varying float vFace;
        void main(){
          vec3 base = vec3(0.012, 0.03, 0.09) * ${kind === "node" ? "2.0" : "1.0"};
          vec3 lit = mix(vec3(0.9, 1.2, 2.2), vec3(0.4, 1.3, 1.8), clamp(vPulse, 0.0, 1.0) * 0.6);
          vec3 col = base + lit * vI * ${kind === "node" ? "1.4" : "0.8"};
          gl_FragColor = vec4(col * mix(0.12, 1.0, vFace), 1.0);
        }`,
    });

    // Nodes.
    const nodeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.042, 1), mat("node"), nodes.length);
    const nDir = new Float32Array(nodes.length * 3);
    const m4 = new THREE.Matrix4();
    nodes.forEach((n, i) => { m4.makeTranslation(n.x, n.y, n.z); nodeMesh.setMatrixAt(i, m4); nDir.set([n.x, n.y, n.z], i * 3); });
    nodeMesh.geometry.setAttribute("aDir", new THREE.InstancedBufferAttribute(nDir, 3));
    group.add(nodeMesh);

    // Struts.
    const strutGeo = new THREE.CylinderGeometry(0.009, 0.009, 1, 6, 1, true);
    const strutMesh = new THREE.InstancedMesh(strutGeo, mat("strut"), edges.length);
    const eDir = new Float32Array(edges.length * 3);
    const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), mid = new THREE.Vector3(), dir = new THREE.Vector3(), sc = new THREE.Vector3();
    edges.forEach(([a, b], i) => {
      mid.addVectors(nodes[a], nodes[b]).multiplyScalar(0.5);
      dir.subVectors(nodes[b], nodes[a]);
      const len = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      m4.compose(mid, q, sc.set(1, len, 1));
      strutMesh.setMatrixAt(i, m4);
      eDir.set([mid.x, mid.y, mid.z], i * 3);
    });
    strutGeo.setAttribute("aDir", new THREE.InstancedBufferAttribute(eDir, 3));
    group.add(strutMesh);

    // Inner core: a counter-rotating icosahedron and a soft glow.
    const core = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 0)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(0.6, 0.8, 1.6), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(core);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: (() => {
        const c = document.createElement("canvas"); c.width = c.height = 128;
        const g = c.getContext("2d"), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, "rgba(160,190,255,0.55)"); grd.addColorStop(0.3, "rgba(80,120,230,0.12)"); grd.addColorStop(1, "rgba(20,40,120,0)");
        g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      })(),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    glow.scale.setScalar(2.4);
    group.add(glow);

    // Faint dust shell.
    const D = 1200, dp = new Float32Array(D * 3), v = new THREE.Vector3();
    for (let i = 0; i < D; i++) { v.set(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(2.3 + r() * 3.5); dp.set([v.x, v.y, v.z], i * 3); }
    const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(dp, 3)),
      new THREE.PointsMaterial({ color: 0x4a6fae, size: 0.025, transparent: true, opacity: 0.6, depthWrite: false }));
    group.add(dust);

    const ray = new THREE.Raycaster(), closest = new THREE.Vector3(), centre = new THREE.Vector3(), local = new THREE.Vector3();
    let next = 0, slot = 0, rotY = 0;
    return (t, dt) => {
      U.uTime.value = t;
      if (t > next) {
        v.set(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
        pulses[slot].set(v.x, v.y, v.z, t);
        slot = (slot + 1) % 4;
        next = t + 1.4 + r() * 1.2;
      }
      rotY += dt * (0.12 + pointer.x * 0.1);
      group.rotation.set(0.35 - pointer.y * 0.25, rotY, 0.12);
      core.rotation.set(-t * 0.3, -t * 0.4, 0);
      dust.rotation.y = -rotY * 0.5;

      // Point on the sphere closest to the pointer ray, in lattice space.
      group.updateMatrixWorld();
      ray.setFromCamera(pointer, camera);
      group.getWorldPosition(centre);
      const hit = ray.ray.intersectSphere(new THREE.Sphere(centre, R), closest) || ray.ray.closestPointToPoint(centre, closest);
      local.copy(hit);
      group.worldToLocal(local);
      U.uP.value.lerp(local.normalize(), 0.25).normalize();
    };
  },
};
