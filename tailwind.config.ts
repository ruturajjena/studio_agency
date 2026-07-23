import type { Config } from "tailwindcss";

/**
 * Tailwind is used for LAYOUT ONLY (flex, grid, spacing, positioning).
 * Typography is bespoke — see the fluid `--display-*` scale in globals.css and
 * the `.display` / `.text-*` utilities. Colors are driven by CSS variables that
 * are hydrated from `config/theme.ts`, so a buyer changes the palette in one place.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./config/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        line: "var(--color-line)",
        accent: "var(--color-accent)",
        "accent-ink": "var(--color-accent-ink)",
      },
      fontFamily: {
        display: "var(--font-display)",
        sans: "var(--font-sans)",
      },
      transitionTimingFunction: {
        // The house easing — used everywhere for reveals.
        studio: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      maxWidth: {
        editorial: "1600px",
      },
    },
  },
  plugins: [],
};

export default config;
