"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useReducedMotion } from "@/lib/hooks";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * MaskReveal — the house line-mask reveal.
 * Wrap lines of a headline; each rises from behind an overflow-hidden mask.
 * Under reduced-motion it becomes a plain, instant block (no transform).
 */
export function MaskReveal({
  children,
  delay = 0,
  className,
  as = "span",
  trigger = "inView",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "span" | "div";
  /** "inView" reveals on scroll (default); "mount" reveals immediately — use
   *  this for above-the-fold hero type that must not wait for an intersection. */
  trigger?: "inView" | "mount";
}) {
  const reduced = useReducedMotion();
  const Wrapper = as;
  if (reduced) {
    return <Wrapper className={className}>{children}</Wrapper>;
  }
  const anim =
    trigger === "mount"
      ? { animate: { y: "0%" } }
      : {
          whileInView: { y: "0%" },
          viewport: { once: true, margin: "-10% 0px" },
        };
  return (
    <Wrapper className={`line-mask ${className ?? ""}`}>
      <motion.span
        style={{ display: "block", willChange: "transform" }}
        initial={{ y: "110%" }}
        {...anim}
        transition={{ duration: 1, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </Wrapper>
  );
}

/**
 * Rise — a subtle blur-up + translate for blocks (paragraphs, meta, images).
 * Nothing pops: it eases in from below with a touch of blur.
 */
export function Rise({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 1, ease: EASE, delay }}
      style={{ willChange: "transform, opacity, filter" }}
    >
      {children}
    </motion.div>
  );
}

/** Small helper for staggering a group of Rise/MaskReveal children by index. */
export function stagger(i: number, base = 0.06) {
  return i * base;
}

/** Re-export for callers that just want the inView primitive. */
export { useInView };
