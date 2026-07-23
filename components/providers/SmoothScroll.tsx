"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "@/lib/hooks";

/**
 * Lenis smooth-scroll provider.
 * Everything in the site — framer-motion `useScroll`, the WebGL gallery, the
 * scroll-velocity hero — reads from the SAME Lenis instance exposed here, so
 * motion stays in sync frame-for-frame.
 *
 * `velocity` is the normalised scroll speed (px/frame-ish), consumed by the
 * hero skew and the velocity-reactive headline.
 */
type ScrollState = {
  lenis: Lenis | null;
  velocity: number;
};

const ScrollCtx = createContext<ScrollState>({ lenis: null, velocity: 0 });

export const useSmoothScroll = () => useContext(ScrollCtx);

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    // Reduced motion → skip Lenis entirely; native scroll, no smoothing.
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
      wheelMultiplier: 1,
    });
    lenisRef.current = lenis;
    document.documentElement.classList.add("lenis");

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onScroll = (e: { velocity: number }) => setVelocity(e.velocity);
    lenis.on("scroll", onScroll);

    // Anchor links (nav) → smooth Lenis scroll to target.
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement)?.closest?.(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null;
      if (!a) return;
      // Links tagged for the curtain transition are handled by <PageCurtain/>.
      if (a.hasAttribute("data-transition")) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (el) {
        ev.preventDefault();
        lenis.scrollTo(el as HTMLElement, { offset: 0 });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      lenis.off("scroll", onScroll);
      document.removeEventListener("click", onClick);
      document.documentElement.classList.remove("lenis");
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  return (
    <ScrollCtx.Provider value={{ lenis: lenisRef.current, velocity }}>
      {children}
    </ScrollCtx.Provider>
  );
}
