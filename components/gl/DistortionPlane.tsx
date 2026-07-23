"use client";

import { Suspense, useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { fragmentShader, vertexShader } from "@/shaders/distortion";
import { theme } from "@/config/theme";

/** Convert a #rrggbb hex to a normalised THREE.Color-ready [r,g,b]. */
function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

/**
 * The plane itself. Fills the canvas viewport, samples the project image as a
 * texture and runs the distortion shader. Pointer tracking + eased hover are
 * done here so mouse-leave settles smoothly.
 */
function Plane({ src }: { src: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const texture = useTexture(src);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Target values we lerp toward each frame.
  const hoverTarget = useRef(0);
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));

  const imageAspect = useMemo(() => {
    const img = texture.image as { width: number; height: number } | undefined;
    return img && img.height ? img.width / img.height : 1;
  }, [texture]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0 },
      uTime: { value: 0 },
      uImageAspect: { value: imageAspect },
      uPlaneAspect: { value: 1 },
      uAccent: { value: new THREE.Vector3(...hexToRgb(theme.palette.accent)) },
    }),
    [texture, imageAspect]
  );

  useFrame((_, delta) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uTime.value += delta;
    // Ease hover + mouse for that premium settle.
    u.uHover.value += (hoverTarget.current - u.uHover.value) * 0.08;
    (u.uMouse.value as THREE.Vector2).lerp(mouse.current, 0.12);
    u.uPlaneAspect.value = viewport.width / viewport.height;
  });

  return (
    <mesh
      ref={mesh}
      scale={[viewport.width, viewport.height, 1]}
      onPointerMove={(e) => {
        if (e.uv) mouse.current.set(e.uv.x, e.uv.y);
      }}
      onPointerOver={() => (hoverTarget.current = 1)}
      onPointerOut={() => {
        hoverTarget.current = 0;
        mouse.current.set(0.5, 0.5);
      }}
    >
      <planeGeometry args={[1, 1, 32, 32]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/**
 * Canvas wrapper. DPR capped at 2, orthographic-ish default camera. Lazy: the
 * parent only mounts this when the tile is on screen (see LazyGL).
 */
export default function DistortionPlane({ src }: { src: string }) {
  const [ready, setReady] = useState(false);
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 2], fov: 45 }}
      onCreated={() => setReady(true)}
      style={{
        position: "absolute",
        inset: 0,
        opacity: ready ? 1 : 0,
        transition: "opacity 0.6s var(--ease-studio)",
      }}
    >
      <Suspense fallback={null}>
        <Plane src={src} />
      </Suspense>
    </Canvas>
  );
}
