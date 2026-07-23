"use client";

import { theme } from "@/config/theme";
import { Marquee } from "@/components/motion/Marquee";
import { useLocalTime, useMounted } from "@/lib/hooks";

/**
 * SECTION 10 — Footer.
 * Studio-name marquee again, socials, a live local-time clock, and the
 * "Built with Studio" credit.
 */
export function Footer() {
  const mounted = useMounted();
  const time = useLocalTime(theme.studio.timezone);

  return (
    <footer style={{ borderTop: `1px solid ${theme.palette.line}`, paddingTop: "clamp(3rem, 8vw, 6rem)" }}>
      {/* Marquee */}
      <div style={{ overflow: "hidden", paddingBottom: "clamp(2rem, 6vw, 5rem)" }}>
        <Marquee speed={30} reverse>
          <span
            className="font-display"
            style={{
              fontSize: "clamp(4rem, 16vw, 14rem)",
              letterSpacing: "-0.04em",
              paddingInline: "clamp(1rem, 3vw, 3rem)",
              lineHeight: 1,
            }}
          >
            {theme.studio.name} —&nbsp;
          </span>
        </Marquee>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "2rem",
          padding: "0 var(--gutter) clamp(2rem, 5vw, 3rem)",
          borderTop: `1px solid ${theme.palette.line}`,
          paddingTop: "clamp(1.5rem, 4vw, 2.5rem)",
          alignItems: "start",
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>Studio</div>
          <div style={{ color: theme.palette.muted, fontSize: "0.85rem" }}>
            {theme.studio.location}
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>Connect</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {theme.socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="hover"
                  className="footer-link"
                  style={{ fontSize: "0.85rem" }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>Local time</div>
          <div className="font-display" style={{ fontSize: "1.4rem" }}>
            {mounted ? time : "--:--:--"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
          <a href="#top" data-cursor="hover" className="footer-link" style={{ fontSize: "0.85rem" }}>
            Back to top ↑
          </a>
          <div style={{ color: theme.palette.muted, fontSize: "0.75rem" }}>
            © {theme.footer.year} {theme.studio.name}. {theme.footer.credit}.
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-link {
          position: relative;
          color: ${theme.palette.text};
          transition: color 0.3s ease;
        }
        .footer-link:hover {
          color: ${theme.palette.accent};
        }
      `}</style>
    </footer>
  );
}
