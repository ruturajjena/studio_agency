"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks";

/**
 * Magnetic hover — the element is pulled toward the pointer while hovered and
 * springs back on leave. Used on the contact CTA + can wrap any control.
 * Disabled under reduced-motion (renders a plain element).
 */
export function MagneticButton({
  children,
  as = "a",
  href,
  onClick,
  strength = 0.4,
  className,
  ...rest
}: {
  children: React.ReactNode;
  as?: "a" | "button";
  href?: string;
  onClick?: () => void;
  strength?: number;
  className?: string;
  [key: string]: unknown;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 });

  const handleMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const relX = e.clientX - (r.left + r.width / 2);
    const relY = e.clientY - (r.top + r.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const MotionTag = as === "button" ? motion.button : motion.a;

  return (
    <MotionTag
      ref={ref as never}
      href={href}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: reduced ? 0 : sx, y: reduced ? 0 : sy, display: "inline-flex" }}
      data-cursor="hover"
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
