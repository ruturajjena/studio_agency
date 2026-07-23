"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useSmoothScroll } from "@/components/providers/SmoothScroll";
import { useReducedMotion } from "@/lib/hooks";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * SIGNATURE ELEMENT #5 — Page/section curtain transition.
 *
 * Clicking a nav link (any anchor tagged `data-transition`) sweeps a full-screen
 * accent curtain up over the viewport; at the peak we jump to the target section
 * instantly, then the curtain lifts away to REVEAL the incoming section beneath.
 *
 * Reduced-motion: no curtain — just a direct scroll.
 */
export function PageCurtain() {
  const { lenis } = useSmoothScroll();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState("");
  const targetRef = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.(
        "a[data-transition]"
      ) as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      e.preventDefault();
      e.stopPropagation();

      const jump = () => {
        const el = document.querySelector(href) as HTMLElement | null;
        if (!el) return;
        if (lenis) lenis.scrollTo(el, { immediate: true });
        else el.scrollIntoView();
      };

      if (reduced) {
        jump();
        return;
      }

      setLabel(a.dataset.transition || a.textContent || "");
      targetRef.current = href;
      setActive(true);
      // Jump under the cover of the curtain (matches the cover keyframe timing).
      window.setTimeout(jump, 520);
      // Lift the curtain after the reveal completes.
      window.setTimeout(() => setActive(false), 560);
    };

    // Capture phase so we beat the SmoothScroll anchor handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [lenis, reduced]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="curtain"
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: theme.palette.accent,
            color: theme.palette.accentInk,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <span
            className="font-display"
            style={{
              fontSize: "clamp(2.5rem, 10vw, 8rem)",
              letterSpacing: "-0.03em",
              fontWeight: 600,
            }}
          >
            {label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
