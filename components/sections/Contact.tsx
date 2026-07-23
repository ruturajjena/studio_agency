"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { theme } from "@/config/theme";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { useReducedMotion } from "@/lib/hooks";

/**
 * SECTION 9 — Contact / big CTA.
 * An enormous "Let's talk" that leans toward the cursor (mouse-parallax), an
 * email link, and a magnetic button that pulls toward the pointer.
 */
export function Contact() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  // Pointer parallax for the headline.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20 });
  const sy = useSpring(py, { stiffness: 60, damping: 20 });
  const rotX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-8, 8]);
  const tx = useTransform(sx, [-0.5, 0.5], ["-2%", "2%"]);

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  const c = theme.contact;

  return (
    <section
      id="contact"
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(6rem, 12vh, 10rem) var(--gutter)",
        perspective: 1000,
      }}
    >
      <span className="eyebrow" style={{ display: "block", marginBottom: "2rem" }}>
        [ 07 ] — {c.sub}
      </span>

      <motion.h2
        className="display-3xl font-display"
        style={{
          rotateX: reduced ? 0 : rotX,
          rotateY: reduced ? 0 : rotY,
          x: reduced ? 0 : tx,
          transformStyle: "preserve-3d",
          lineHeight: 0.82,
        }}
      >
        {c.heading}
        <span style={{ color: theme.palette.accent }}>.</span>
      </motion.h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(1.5rem, 4vw, 3rem)",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "clamp(3rem, 8vw, 6rem)",
          borderTop: `1px solid ${theme.palette.line}`,
          paddingTop: "clamp(2rem, 5vw, 3rem)",
        }}
      >
        <a
          href={`mailto:${c.email}`}
          data-cursor="hover"
          className="font-display email-link"
          style={{ fontSize: "clamp(1.3rem, 3vw, 2.4rem)", letterSpacing: "-0.02em" }}
        >
          {c.email}
        </a>

        <MagneticButton href={`mailto:${c.email}`} strength={0.5}>
          <span className="cta-btn">
            {c.buttonLabel}
            <ArrowUpRight size={20} />
          </span>
        </MagneticButton>
      </div>

      <style jsx>{`
        .email-link {
          position: relative;
        }
        .email-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -4px;
          height: 1px;
          width: 100%;
          background: currentColor;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.5s var(--ease-studio);
        }
        .email-link:hover::after {
          transform: scaleX(1);
        }
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: ${theme.palette.accent};
          color: ${theme.palette.accentInk};
          padding: 1.1rem 1.8rem;
          border-radius: 999px;
          font-weight: 500;
          font-size: 0.95rem;
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}
