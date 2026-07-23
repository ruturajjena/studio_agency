"use client";

import { motion } from "framer-motion";
import { theme } from "@/config/theme";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Fixed top navigation. Uses mix-blend-difference so it stays legible over both
 * the dark canvas and any light sections without extra logic. Enters after the
 * preloader curtain (delayed).
 */
export function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: 1.5 }}
      className="site-nav"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        mixBlendMode: "difference",
        color: "#fff",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "clamp(1rem, 2.4vw, 1.6rem) var(--gutter)",
        }}
      >
        <a
          href="#top"
          data-cursor="hover"
          className="font-display"
          style={{ fontSize: "1.1rem", letterSpacing: "-0.02em", fontWeight: 600 }}
        >
          {theme.studio.name}
          <span style={{ color: theme.palette.accent }}>®</span>
        </a>

        <ul
          style={{
            display: "flex",
            gap: "clamp(1rem, 2.5vw, 2.5rem)",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {theme.nav.map((n) => (
            <li key={n.href}>
              <a
                href={n.href}
                data-cursor="hover"
                data-transition={n.label}
                className="nav-link"
                style={{ fontSize: "0.82rem", letterSpacing: "0.02em" }}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <style jsx>{`
        .nav-link {
          position: relative;
        }
        .nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -3px;
          height: 1px;
          width: 0;
          background: currentColor;
          transition: width 0.4s var(--ease-studio);
        }
        .nav-link:hover::after {
          width: 100%;
        }
      `}</style>
    </motion.header>
  );
}
