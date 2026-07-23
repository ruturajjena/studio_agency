"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { theme } from "@/config/theme";
import { useReducedMotion } from "@/lib/hooks";

/**
 * SECTION 3 — Intro / manifesto.
 * A large statement where each WORD lights from muted → full ink as it scrolls
 * through the viewport; a curated set of keywords resolve to the accent colour.
 * The classic "reading light" reveal, tuned to feel unhurried.
 */

// Words that get the accent treatment at full reveal.
const ACCENT_WORDS = new Set([
  "future",
  "future's",
  "tomorrow's",
  "kinetic",
  "alive",
  "inevitable",
  "expensive,",
]);

function Word({
  word,
  progress,
  range,
  accent,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  accent: boolean;
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  const color = useTransform(
    progress,
    range,
    [theme.palette.muted, accent ? theme.palette.accent : theme.palette.text]
  );
  return (
    <motion.span style={{ opacity, color, marginRight: "0.28em", display: "inline-block" }}>
      {word}
    </motion.span>
  );
}

export function Manifesto() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.82", "end 0.45"],
  });

  const words = theme.studio.manifesto.split(" ");

  return (
    <section
      id="intro"
      style={{ padding: "clamp(8rem, 18vh, 16rem) var(--gutter)" }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span className="eyebrow" style={{ marginBottom: "3rem", display: "block" }}>
          [ 01 ] — Manifesto
        </span>
      </div>
      <div ref={ref} style={{ position: "relative", maxWidth: "22ch", marginInline: "auto" }}>
        <p
          className="font-display"
          style={{
            fontSize: "var(--display-md)",
            lineHeight: 1.18,
            letterSpacing: "-0.02em",
            fontWeight: 500,
          }}
        >
          {reduced
            ? theme.studio.manifesto
            : words.map((w, i) => {
                const start = i / words.length;
                const end = Math.min(1, (i + 1.5) / words.length);
                return (
                  <Word
                    key={i}
                    word={w}
                    progress={scrollYProgress}
                    range={[start, end]}
                    accent={ACCENT_WORDS.has(w.toLowerCase())}
                  />
                );
              })}
        </p>
      </div>
    </section>
  );
}
