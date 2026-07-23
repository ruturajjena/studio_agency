"use client";

import { useReducedMotion } from "@/lib/hooks";

/**
 * Infinite CSS marquee (studio name, client list).
 * Duplicates its children so the scroll loops seamlessly. Pure CSS transform —
 * cheap, and it freezes gracefully under reduced-motion.
 */
export function Marquee({
  children,
  speed = 30,
  reverse = false,
  className,
}: {
  children: React.ReactNode;
  speed?: number; // seconds per loop
  reverse?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={`marquee ${className ?? ""}`} aria-hidden>
      <div
        className="marquee__track"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? "reverse" : "normal",
          animationPlayState: reduced ? "paused" : "running",
        }}
      >
        <span className="marquee__group">{children}</span>
        <span className="marquee__group">{children}</span>
      </div>
      <style jsx>{`
        .marquee {
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
        }
        .marquee__track {
          display: inline-flex;
          animation-name: marquee-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .marquee__group {
          display: inline-flex;
          align-items: center;
        }
        @keyframes marquee-scroll {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
