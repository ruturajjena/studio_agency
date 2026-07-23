"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useReducedMotion } from "@/lib/hooks";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * SECTION 1 — Preloader.
 * The studio name assembles while a 0→100 counter runs, then the panel lifts
 * like a curtain to reveal the hero. Whole thing is tuned to ~1.4s.
 *
 * Emits `onDone` so the hero can start its entrance exactly as the curtain goes.
 * Reduced-motion: a brief hold + fade, no counter theatrics.
 */
export function Preloader({ onDone }: { onDone?: () => void }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const [gone, setGone] = useState(false);
  // Hard kill-switch: guarantees the overlay is fully unmounted even if the
  // exit animation can't run (e.g. the tab was backgrounded during load and
  // rAF-driven framer transitions are paused). The site is never trapped.
  const [killed, setKilled] = useState(false);

  useEffect(() => {
    const kill = setTimeout(() => {
      setKilled(true);
      onDone?.();
    }, 3000);
    return () => clearTimeout(kill);
  }, [onDone]);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setCount(100);
      setGone(true);
      onDone?.();
    };

    if (reduced) {
      const t = setTimeout(finish, 500);
      return () => clearTimeout(t);
    }

    // Count 0 → 100 over ~1.1s, then trigger the curtain.
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // decelerating counter
      setCount(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(finish, 180); // hold a beat, then lift
    };
    raf = requestAnimationFrame(tick);

    // SAFETY NET: rAF is paused in background tabs, which would otherwise leave
    // the preloader covering the page forever. setTimeout still fires when
    // hidden, so this guarantees the site always reveals (~1.5s cap).
    const safety = setTimeout(finish, 1600);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [reduced, onDone]);

  // Assemble the studio name letter-by-letter.
  const letters = theme.studio.name.split("");

  if (killed) return null;

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          className="preloader"
          exit={
            reduced
              ? { opacity: 0 }
              : { y: "-100%" }
          }
          transition={{ duration: reduced ? 0.4 : 0.9, ease: EASE }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "var(--color-bg)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ textAlign: "center", padding: "0 var(--gutter)" }}>
            <div
              className="display-lg font-display"
              style={{ display: "flex", justifyContent: "center", gap: "0.02em" }}
            >
              {letters.map((l, i) => (
                <motion.span
                  key={i}
                  initial={reduced ? false : { y: "120%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{
                    duration: 0.7,
                    ease: EASE,
                    delay: reduced ? 0 : 0.05 * i,
                  }}
                  style={{ display: "inline-block" }}
                >
                  {l}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Bottom-row counter + label */}
          <div
            style={{
              position: "absolute",
              bottom: "clamp(1.5rem, 4vw, 3rem)",
              left: "var(--gutter)",
              right: "var(--gutter)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <span className="eyebrow">{theme.studio.role}</span>
            <span
              className="font-display"
              style={{ fontSize: "clamp(1.5rem, 5vw, 3.5rem)", lineHeight: 1 }}
            >
              {reduced ? "100" : count}
              <span style={{ color: "var(--color-accent)" }}>%</span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
