"use client";

import { theme } from "@/config/theme";
import { Rise } from "@/components/motion/Reveal";

/**
 * SECTION 8 — Awards / recognition.
 * A clean list with a per-row hover state: the row lifts to the accent and an
 * index mark slides in. Hairline dividers, generous rhythm.
 */
export function Awards() {
  return (
    <section
      id="awards"
      style={{ padding: "clamp(6rem, 14vh, 12rem) var(--gutter)" }}
    >
      <span className="eyebrow" style={{ display: "block", marginBottom: "clamp(2rem, 5vw, 4rem)" }}>
        [ 06 ] — Recognition
      </span>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {theme.awards.map((a, i) => (
          <Rise key={`${a.title}-${i}`} delay={i * 0.05}>
            <li className="award-row" data-cursor="hover">
              <span className="award-mark" aria-hidden>
                ↗
              </span>
              <span className="award-title font-display">{a.title}</span>
              <span className="award-org">{a.org}</span>
              <span className="award-year">{a.year}</span>
            </li>
          </Rise>
        ))}
      </ul>

      <style jsx>{`
        .award-row {
          display: grid;
          grid-template-columns: 2rem 1fr auto auto;
          align-items: baseline;
          gap: clamp(1rem, 3vw, 3rem);
          padding: clamp(1.1rem, 2.6vw, 1.8rem) 0;
          border-top: 1px solid ${theme.palette.line};
          transition: color 0.4s var(--ease-studio), padding-left 0.4s var(--ease-studio);
        }
        .award-row:hover {
          color: ${theme.palette.accent};
          padding-left: 1rem;
        }
        .award-mark {
          color: ${theme.palette.accent};
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.4s var(--ease-studio), transform 0.4s var(--ease-studio);
        }
        .award-row:hover .award-mark {
          opacity: 1;
          transform: translateX(0);
        }
        .award-title {
          font-size: clamp(1.5rem, 4vw, 3rem);
          letter-spacing: -0.02em;
        }
        .award-org {
          color: ${theme.palette.muted};
          font-size: 0.9rem;
        }
        .award-row:hover .award-org {
          color: inherit;
        }
        .award-year {
          color: ${theme.palette.muted};
          font-size: 0.9rem;
        }
        .award-row:hover .award-year {
          color: inherit;
        }
        @media (max-width: 640px) {
          .award-row {
            grid-template-columns: 1.5rem 1fr auto;
          }
          .award-org {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
