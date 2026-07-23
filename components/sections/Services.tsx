"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { MaskReveal } from "@/components/motion/Reveal";
import { useIsTouch } from "@/lib/hooks";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * SECTION 6 — Services / capabilities.
 * An interactive list: hovering a row reveals its related visual in the panel
 * and nudges the row toward the accent. Big type, hairline dividers.
 * Touch devices get an inline visual under each row instead of hover.
 */
export function Services() {
  const touch = useIsTouch();
  const [active, setActive] = useState<number>(0);

  return (
    <section
      id="services"
      style={{ padding: "clamp(6rem, 14vh, 12rem) var(--gutter)" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "clamp(2rem, 5vw, 4rem)",
        }}
      >
        <h2 className="display-lg font-display">
          <MaskReveal>Capabilities</MaskReveal>
        </h2>
        <span className="eyebrow">[ 04 ] — What we do</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: touch ? "1fr" : "1.4fr 1fr",
          gap: "clamp(2rem, 5vw, 5rem)",
          alignItems: "start",
        }}
      >
        {/* List */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {theme.services.map((svc, i) => (
            <li
              key={svc.title}
              onMouseEnter={() => setActive(i)}
              data-cursor="hover"
              style={{ borderTop: `1px solid ${theme.palette.line}` }}
            >
              <motion.div
                animate={{ x: !touch && active === i ? 24 : 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "clamp(1.1rem, 2.6vw, 2rem) 0",
                  gap: "1rem",
                }}
              >
                <span
                  className="display-md font-display"
                  style={{
                    color:
                      !touch && active === i
                        ? theme.palette.accent
                        : theme.palette.text,
                    transition: "color 0.4s var(--ease-studio)",
                  }}
                >
                  {svc.title}
                </span>
                <span
                  style={{
                    color: theme.palette.muted,
                    fontSize: "0.8rem",
                    maxWidth: "22ch",
                    textAlign: "right",
                    flex: "0 1 auto",
                  }}
                >
                  {svc.blurb}
                </span>
              </motion.div>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", paddingBottom: "1.2rem" }}>
                {svc.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: "0.7rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: theme.palette.muted,
                      border: `1px solid ${theme.palette.line}`,
                      borderRadius: 999,
                      padding: "0.3rem 0.7rem",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Touch inline visual */}
              {touch && (
                <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", marginBottom: "1.5rem", background: theme.palette.surface }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={svc.image} alt={svc.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </li>
          ))}
          <li style={{ borderTop: `1px solid ${theme.palette.line}` }} />
        </ul>

        {/* Desktop hover preview panel */}
        {!touch && (
          <div
            style={{
              position: "sticky",
              top: "18vh",
              aspectRatio: "4 / 5",
              overflow: "hidden",
              background: theme.palette.surface,
            }}
          >
            <AnimatePresence mode="popLayout">
              <motion.img
                key={active}
                src={theme.services[active].image}
                alt={theme.services[active].title}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </AnimatePresence>
            <div
              style={{
                position: "absolute",
                left: "1rem",
                bottom: "1rem",
                mixBlendMode: "difference",
                color: "#fff",
              }}
              className="eyebrow"
            >
              {theme.services[active].title}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
