"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks";

/**
 * Mounts one of the 50 BrandMotion hero studies (brandmotion-3d/designs/dNN.js)
 * on a full-size canvas. `id` is the two-digit study number, e.g. "07".
 * `theme` overrides the study's default colour theme (see THEMES in stage.js).
 */
export function BrandMotionDesign({ id, theme, style }: { id: string; theme?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let disposed = false;
    let handle: { dispose: () => void } | undefined;
    Promise.all([import("@/brandmotion-3d/designs/stage.js"), import(`@/brandmotion-3d/designs/d${id}.js`)]).then(
      ([{ createStage }, design]) => {
        if (disposed || !ref.current) return;
        handle = createStage(ref.current, design.default, { reducedMotion: reduced, theme });
      }
    );
    return () => {
      disposed = true;
      handle?.dispose();
    };
  }, [id, theme, reduced]);

  return <canvas ref={ref} aria-hidden style={{ display: "block", width: "100%", height: "100%", ...style }} />;
}
