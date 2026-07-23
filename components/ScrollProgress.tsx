"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { theme } from "@/config/theme";

/** Thin accent scroll-progress rule pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  return (
    <motion.div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        transformOrigin: "0% 50%",
        scaleX,
        background: theme.palette.accent,
        zIndex: 70,
      }}
    />
  );
}
