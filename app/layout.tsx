import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import { theme } from "@/config/theme";
import { ThemeStyle } from "@/components/ThemeStyle";
import "./globals.css";

/**
 * Fonts.
 * Defaults ship with two variable Google faces that get very close to the
 * Clash Display / Neue Montreal feel and require zero licensing:
 *   ▸ display  → Bricolage Grotesque (oversized kinetic headlines)
 *   ▸ body     → Space Grotesk       (clean grotesk UI + copy)
 *
 * To use the real Clash Display / Neue Montreal, drop the .woff2 files in
 * /app/fonts, swap these for next/font/local, and keep the same CSS variable
 * names — nothing else changes. (See README.)
 */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: theme.studio.fullName,
  description: theme.studio.manifesto,
  openGraph: {
    title: theme.studio.fullName,
    description: theme.studio.tagline,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: theme.palette.bg,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        {/* Injects palette CSS variables from theme.ts — single source of truth. */}
        <ThemeStyle />
        {children}
      </body>
    </html>
  );
}
