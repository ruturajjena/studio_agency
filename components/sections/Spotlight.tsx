"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { theme } from "@/config/theme";
import { MaskReveal, Rise } from "@/components/motion/Reveal";
import { useReducedMotion } from "@/lib/hooks";

/**
 * SECTION 5 — Featured project spotlight.
 * One large project: an autoplay video loop (played ONLY while in view for
 * performance), a big parallaxing title, and a "next project" hint.
 */
export function Spotlight() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const s = theme.spotlight;

  // Play/pause the video based on visibility — no wasted decode off-screen.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.15, 1, 1.15]);

  return (
    <section
      id="spotlight"
      ref={ref}
      style={{ position: "relative", padding: "clamp(6rem, 14vh, 12rem) var(--gutter)" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "2.5rem",
        }}
      >
        <span className="eyebrow">[ 03 ] — {s.eyebrow}</span>
        <span className="eyebrow">{s.year}</span>
      </div>

      {/* Big masked title over the video */}
      <div style={{ position: "relative", overflow: "hidden", background: theme.palette.surface }}>
        <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden" }}>
          <motion.video
            ref={videoRef}
            src={s.video}
            poster={s.poster}
            muted
            loop
            playsInline
            preload="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              y: reduced ? 0 : y,
              scale: reduced ? 1 : scale,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(11,11,13,0.6), rgba(11,11,13,0) 45%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "clamp(1rem, 3vw, 3rem)",
              bottom: "clamp(1rem, 3vw, 3rem)",
              right: "clamp(1rem, 3vw, 3rem)",
            }}
          >
            <h2 className="display-2xl font-display" style={{ mixBlendMode: "difference", color: "#fff" }}>
              <MaskReveal>{s.title}</MaskReveal>
            </h2>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          marginTop: "2rem",
          alignItems: "start",
        }}
      >
        <Rise>
          <p className="text-lead" style={{ maxWidth: "40ch" }}>
            {s.copy}
          </p>
        </Rise>
        <Rise delay={0.1}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{ color: theme.palette.muted }}>{s.category}</span>
            <a
              href="#work"
              data-cursor="hover"
              className="font-display next-hint"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "clamp(1.2rem, 2.4vw, 2rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {s.nextHint}
              <ArrowUpRight size={22} color={theme.palette.accent} />
            </a>
          </div>
        </Rise>
      </div>

      <style jsx>{`
        .next-hint {
          transition: opacity 0.3s var(--ease-studio);
        }
        .next-hint:hover {
          opacity: 0.6;
        }
      `}</style>
    </section>
  );
}
