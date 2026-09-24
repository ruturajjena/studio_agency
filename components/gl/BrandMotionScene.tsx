"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks";

/**
 * BrandMotion "Fractured Core" — full-bleed WebGL hero backdrop.
 * The scene itself is framework-free (brandmotion-3d/scene.js) and loaded
 * lazily so three.js never touches the server bundle.
 */
export function BrandMotionScene({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let disposed = false;
    let handle: { dispose: () => void } | undefined;
    import("@/brandmotion-3d/scene.js").then(({ createBrandMotionScene }) => {
      if (disposed || !ref.current) return;
      handle = createBrandMotionScene(ref.current, { reducedMotion: reduced });
    });
    return () => {
      disposed = true;
      handle?.dispose();
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
