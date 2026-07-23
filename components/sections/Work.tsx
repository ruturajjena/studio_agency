"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { theme } from "@/config/theme";
import { DistortionImage } from "@/components/gl/DistortionImage";
import { useIsTouch, useReducedMotion } from "@/lib/hooks";

/**
 * SECTION 4 — Selected work (horizontal-scroll gallery).
 *
 * SIGNATURE ELEMENT #3. On desktop, vertical scroll is translated into
 * horizontal movement through a pinned track (Lenis drives the page; framer maps
 * progress → x). Each tile carries the WebGL hover-distortion (#2) and the cursor
 * reads "Drag" over the track / "View" over a tile.
 *
 * Touch devices: the track becomes a native horizontal swipe strip — same vibe,
 * no scroll-jacking. Reduced-motion: a simple stacked grid.
 */
export function Work() {
  const touch = useIsTouch();
  const reduced = useReducedMotion();

  // ── Reduced motion → honest, calm stacked grid ────────────────────────────
  if (reduced) return <WorkGrid />;
  // ── Touch → native horizontal swipe strip ─────────────────────────────────
  if (touch) return <WorkSwipe />;
  // ── Desktop → pinned scroll-jack ──────────────────────────────────────────
  return <WorkPinned />;
}

/* ── Section header shared by every variant ───────────────────────────────── */
function Header() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        padding: "0 var(--gutter)",
        marginBottom: "clamp(2rem, 5vw, 4rem)",
      }}
    >
      <h2 className="display-lg font-display">Selected&nbsp;Work</h2>
      <span className="eyebrow">
        [ 02 ] — {String(theme.projects.length).padStart(2, "0")} Projects
      </span>
    </div>
  );
}

/* ── A single tile (reused everywhere) ────────────────────────────────────── */
function Tile({ i }: { i: number }) {
  const p = theme.projects[i];
  return (
    <a
      href="#spotlight"
      data-cursor="view"
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "4 / 5",
          background: theme.palette.surface,
          overflow: "hidden",
        }}
      >
        <DistortionImage src={p.image} alt={p.title} />
        <span
          className="font-display"
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            fontSize: "0.8rem",
            mixBlendMode: "difference",
            color: "#fff",
          }}
        >
          {p.index}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: "1rem",
          borderTop: `1px solid ${theme.palette.line}`,
          paddingTop: "0.85rem",
        }}
      >
        <div>
          <div
            className="font-display"
            style={{ fontSize: "clamp(1.3rem, 2vw, 2rem)", letterSpacing: "-0.02em" }}
          >
            {p.title}
          </div>
          <div style={{ color: theme.palette.muted, fontSize: "0.82rem", marginTop: 2 }}>
            {p.category}
          </div>
        </div>
        <span style={{ color: theme.palette.muted, fontSize: "0.82rem" }}>{p.year}</span>
      </div>
    </a>
  );
}

/* ── Desktop pinned scroll-jack ───────────────────────────────────────────── */
function WorkPinned() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  // Measure how far the track must travel (track width − viewport width).
  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      setDistance(trackRef.current.scrollWidth - window.innerWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const x = useSpring(useTransform(scrollYProgress, [0, 1], [0, -distance]), {
    stiffness: 120,
    damping: 30,
    mass: 0.5,
  });

  return (
    <section
      id="work"
      ref={sectionRef}
      style={{ position: "relative", height: `${theme.projects.length * 68}vh` }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100svh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ paddingTop: "6vh" }}>
          <Header />
        </div>
        <motion.div
          ref={trackRef}
          data-cursor="drag"
          style={{
            x,
            display: "flex",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            paddingLeft: "var(--gutter)",
            paddingRight: "40vw",
            willChange: "transform",
          }}
        >
          {theme.projects.map((_, i) => (
            <div key={i} style={{ flex: "0 0 auto", width: "min(38vw, 460px)" }}>
              <Tile i={i} />
            </div>
          ))}
        </motion.div>
        <div style={{ padding: "3vh var(--gutter) 0" }}>
          <hr className="rule" />
        </div>
      </div>
    </section>
  );
}

/* ── Touch swipe strip ────────────────────────────────────────────────────── */
function WorkSwipe() {
  return (
    <section id="work" style={{ padding: "clamp(4rem, 10vh, 8rem) 0" }}>
      <Header />
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          padding: "0 var(--gutter)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {theme.projects.map((_, i) => (
          <div
            key={i}
            style={{ flex: "0 0 78vw", scrollSnapAlign: "start" }}
          >
            <Tile i={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Reduced-motion stacked grid ──────────────────────────────────────────── */
function WorkGrid() {
  return (
    <section id="work" style={{ padding: "clamp(4rem, 10vh, 8rem) 0" }}>
      <Header />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "clamp(1.5rem, 3vw, 3rem)",
          padding: "0 var(--gutter)",
        }}
      >
        {theme.projects.map((_, i) => (
          <Tile key={i} i={i} />
        ))}
      </div>
    </section>
  );
}
