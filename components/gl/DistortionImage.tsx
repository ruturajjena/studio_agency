"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks";

// Lazy, client-only WebGL — never in the SSR bundle, only loaded when needed.
const DistortionPlane = dynamic(() => import("./DistortionPlane"), {
  ssr: false,
});

/**
 * Tile media wrapper. Layers, from bottom to top:
 *   1. a plain <img> (LCP-friendly, always present, the WebGL poster/fallback)
 *   2. the WebGL distortion canvas — mounted ONLY while the tile is on screen
 *      and only when motion is allowed. Off-screen tiles unmount their GL
 *      context so we never pay for shaders the user can't see (Lighthouse).
 *
 * Reduced-motion path: no WebGL at all, just a tasteful CSS zoom on hover.
 */
export function DistortionImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={`distort-media ${className ?? ""}`}
      style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="distort-media__img"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transition: "transform 0.9s var(--ease-studio)",
        }}
      />
      {!reduced && inView && (
        <DistortionPlane src={src} />
      )}
      <style jsx>{`
        .distort-media:hover .distort-media__img {
          transform: scale(1.04);
        }
      `}</style>
    </div>
  );
}
