"use client";

import { useEffect, useRef, useState } from "react";
import { theme } from "@/config/theme";
import { useIsTouch, useReducedMotion } from "@/lib/hooks";

/**
 * SIGNATURE ELEMENT #1 — Custom cursor.
 *
 * A small trailing dot that:
 *   ▸ scales up + shows a label ("View" / "Drag") over tagged targets
 *   ▸ inverts (fills accent) over interactive elements
 *   ▸ lerps toward the pointer for a smooth premium trail
 *
 * Any element opts in via data attributes (no per-component wiring needed):
 *   data-cursor="view"   → big ring + "View" label
 *   data-cursor="drag"   → big ring + "Drag" label
 *   data-cursor="hover"  → medium ring, accent fill (links, buttons)
 *
 * Fully disabled on touch + reduced-motion → native cursor returns.
 */
export function Cursor() {
  const touch = useIsTouch();
  const reduced = useReducedMotion();
  const disabled = touch || reduced;

  const dotRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"idle" | "hover" | "view" | "drag">("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (disabled) return;
    document.body.classList.add("has-cursor");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = { ...pos };
    const ease = theme.cursor.ease;
    let raf = 0;

    const render = () => {
      pos.x += (target.x - pos.x) * ease;
      pos.y += (target.y - pos.y) * ease;
      const el = dotRef.current;
      if (el) el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) setVisible(true);

      // Resolve the cursor intent from the hovered element's data attributes.
      const hit = (e.target as HTMLElement)?.closest?.(
        "[data-cursor], a, button"
      ) as HTMLElement | null;
      const kind = hit?.dataset?.cursor;
      if (kind === "view") {
        setMode("view");
        setLabel(theme.cursor.labels.view);
      } else if (kind === "drag") {
        setMode("drag");
        setLabel(theme.cursor.labels.drag);
      } else if (hit) {
        setMode("hover");
        setLabel("");
      } else {
        setMode("idle");
        setLabel("");
      }
    };

    const onLeave = () => setVisible(false);
    const onDown = () => dotRef.current?.classList.add("cursor-down");
    const onUp = () => dotRef.current?.classList.remove("cursor-down");

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.body.classList.remove("has-cursor");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  if (disabled) return null;

  const big = mode === "view" || mode === "drag";
  const size = big ? theme.cursor.hoverSize : theme.cursor.size;
  const isFilled = big || mode === "hover";

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="cursor-root"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        width: size,
        height: size,
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        mixBlendMode: isFilled ? "normal" : "difference",
        background: isFilled ? "var(--color-accent)" : "var(--color-text)",
        color: "var(--color-accent-ink)",
        transition:
          "width 0.4s var(--ease-studio), height 0.4s var(--ease-studio), background 0.3s ease",
        willChange: "transform",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: label ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      >
        {label}
      </span>
    </div>
  );
}
