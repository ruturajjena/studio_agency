"use client";

import {
  motion,
  useScroll,
  useVelocity,
  useSpring,
  useTransform,
  useMotionValue,
} from "framer-motion";
import { useRef } from "react";
import { ArrowDown } from "lucide-react";
import { theme } from "@/config/theme";
import { MaskReveal } from "@/components/motion/Reveal";
import { Marquee } from "@/components/motion/Marquee";
import { useReducedMotion } from "@/lib/hooks";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * SECTION 2 — Hero.
 * Oversized kinetic headline (line-mask reveal), a masked video loop beside the
 * type, the studio-name marquee, and a scroll cue.
 *
 * The whole headline SKEWS + SCALES subtly with scroll velocity — the premium
 * "the type is alive" moment. Driven by framer's useVelocity → spring.
 */
export function Hero() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVel = useSpring(scrollVelocity, {
    stiffness: 200,
    damping: 40,
    mass: 0.4,
  });

  // Map velocity → a gentle skew + vertical squash. Clamped so it never breaks.
  const skew = useTransform(smoothVel, [-2500, 0, 2500], [7, 0, -7], {
    clamp: true,
  });
  const scaleY = useTransform(smoothVel, [-2500, 0, 2500], [1.06, 1, 1.06], {
    clamp: true,
  });
  const zero = useMotionValue(0);

  // Parallax the video block as the hero scrolls away.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);

  return (
    <section
      id="top"
      ref={ref}
      style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 var(--gutter)",
        overflow: "hidden",
      }}
    >
      {/* Masked video loop — sits behind/right of the type. */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          right: "0",
          height: "100%",
          width: "min(46vw, 640px)",
          y: reduced ? 0 : videoY,
          maskImage:
            "linear-gradient(to left, black 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to left, black 40%, transparent 100%)",
          opacity: 0.55,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: 1.4, ease: EASE, delay: 1.5 }}
      >
        <video
          src={theme.hero.video}
          poster={theme.hero.poster}
          autoPlay
          muted
          loop
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </motion.div>

      {/* Kinetic headline */}
      <motion.h1
        className="display-2xl font-display"
        style={{
          position: "relative",
          zIndex: 2,
          skewY: reduced ? zero : skew,
          scaleY: reduced ? 1 : scaleY,
          transformOrigin: "left center",
          maxWidth: "16ch",
        }}
      >
        {theme.hero.headline.map((line, i) => (
          <MaskReveal as="span" key={i} trigger="mount" delay={1.5 + i * 0.08}>
            {line === theme.hero.headline[theme.hero.headline.length - 1] ? (
              <span>
                {line}
                <span style={{ color: theme.palette.accent }}>.</span>
              </span>
            ) : (
              line
            )}
          </MaskReveal>
        ))}
      </motion.h1>

      {/* Subline */}
      <motion.p
        className="eyebrow"
        style={{ position: "relative", zIndex: 2, marginTop: "2rem" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 2.1 }}
      >
        {theme.hero.subline}
      </motion.p>

      {/* Scroll cue */}
      <motion.div
        style={{
          position: "absolute",
          bottom: "clamp(1.5rem, 4vw, 2.5rem)",
          left: "var(--gutter)",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          zIndex: 2,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.3 }}
      >
        <motion.span
          animate={reduced ? {} : { y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "grid", placeItems: "center" }}
        >
          <ArrowDown size={16} color={theme.palette.accent} />
        </motion.span>
        <span className="eyebrow">{theme.hero.scrollCue}</span>
      </motion.div>

      {/* Studio-name marquee across the bottom */}
      <div
        style={{
          position: "absolute",
          bottom: "clamp(1.2rem, 3vw, 2rem)",
          right: 0,
          width: "60vw",
          maxWidth: 900,
          zIndex: 1,
          opacity: 0.5,
        }}
      >
        <Marquee speed={28}>
          <span
            className="font-display"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2.4rem)",
              paddingRight: "1.5rem",
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            {theme.studio.name} — {theme.studio.tagline} —&nbsp;
          </span>
        </Marquee>
      </div>
    </section>
  );
}
