import { theme } from "@/config/theme";

/**
 * Server component that maps `theme.palette` → CSS custom properties on :root.
 * This is why a buyer only edits `config/theme.ts` to rebrand colours — every
 * Tailwind token and bespoke utility reads from these variables.
 */
export function ThemeStyle() {
  const p = theme.palette;
  const css = `:root{
    --color-bg:${p.bg};
    --color-surface:${p.surface};
    --color-text:${p.text};
    --color-muted:${p.muted};
    --color-line:${p.line};
    --color-accent:${p.accent};
    --color-accent-ink:${p.accentInk};
  }`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
