"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { theme } from "@/config/theme";
import { MaskReveal, Rise } from "@/components/motion/Reveal";
import { Marquee } from "@/components/motion/Marquee";
import { useReducedMotion } from "@/lib/hooks";

/** Count-up number that animates once when scrolled into view. */
function Counter({ value, suffix }: { value: number; suffix?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setN(value);
      return;
    }
    const dur = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduced]);

  return (
    <span ref={ref} className="font-display" style={{ fontSize: "var(--display-lg)", lineHeight: 1 }}>
      {n}
      {suffix}
    </span>
  );
}

/**
 * SECTION 7 — About / team.
 * Editorial two-column intro, an animated stat row (count-ups), and a marquee of
 * client names.
 */
export function About() {
  return (
    <section
      id="about"
      style={{ padding: "clamp(6rem, 14vh, 12rem) 0", overflow: "hidden" }}
    >
      <div style={{ padding: "0 var(--gutter)" }}>
        <span className="eyebrow" style={{ display: "block", marginBottom: "3rem" }}>
          [ 05 ] — The Studio
        </span>

        <h2 className="display-xl font-display" style={{ maxWidth: "18ch", marginBottom: "clamp(3rem, 8vw, 6rem)" }}>
          {theme.about.heading.split(" ").map((w, i) => (
            <MaskReveal as="span" key={i} delay={i * 0.04}>
              <span style={{ marginRight: "0.25em", display: "inline-block" }}>{w}</span>
            </MaskReveal>
          ))}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "clamp(2rem, 5vw, 5rem)",
            marginBottom: "clamp(4rem, 10vw, 8rem)",
          }}
        >
          <div>
            <span className="eyebrow">{theme.studio.location}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "52ch" }}>
            {theme.about.body.map((para, i) => (
              <Rise key={i} delay={i * 0.08}>
                <p className="text-lead" style={{ color: theme.palette.text }}>
                  {para}
                </p>
              </Rise>
            ))}
          </div>
        </div>

        {/* Stat row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "2rem",
            borderTop: `1px solid ${theme.palette.line}`,
            paddingTop: "clamp(2rem, 5vw, 3.5rem)",
          }}
        >
          {theme.about.stats.map((s) => (
            <div key={s.label}>
              <Counter value={s.value} suffix={s.suffix} />
              <div style={{ color: theme.palette.muted, fontSize: "0.82rem", marginTop: "0.6rem" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Client marquee */}
      <div style={{ marginTop: "clamp(4rem, 10vw, 8rem)", borderBlock: `1px solid ${theme.palette.line}`, paddingBlock: "clamp(1.5rem, 4vw, 3rem)" }}>
        <Marquee speed={36}>
          {theme.about.clients.map((c) => (
            <span
              key={c}
              className="font-display"
              style={{
                fontSize: "clamp(2rem, 5vw, 4rem)",
                letterSpacing: "-0.03em",
                paddingInline: "clamp(1.5rem, 3vw, 2.5rem)",
                color: theme.palette.muted,
              }}
            >
              {c}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
