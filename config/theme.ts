/**
 * ────────────────────────────────────────────────────────────────────────────
 *  STUDIO — SINGLE SOURCE OF TRUTH
 * ────────────────────────────────────────────────────────────────────────────
 *  Everything a buyer needs to rebrand this template lives in THIS file:
 *  copy, colours, navigation, projects, services, awards, socials.
 *
 *  ▸ To swap projects:   edit the `projects` array + drop files in /public/projects
 *  ▸ To change accent:   edit `palette.accent` (one hex value)
 *  ▸ To rename studio:   edit `studio.name`
 *
 *  No other file should need touching for a standard rebrand.
 * ────────────────────────────────────────────────────────────────────────────
 */

export type Project = {
  id: string;
  index: string; // display index, e.g. "01"
  title: string;
  category: string;
  year: string;
  /** Path relative to /public. Image is required (used as WebGL texture + poster). */
  image: string;
  /** Optional looping video for the tile / spotlight. */
  video?: string;
  /** Short line shown in the spotlight + tile meta. */
  description?: string;
};

export type Service = {
  title: string;
  blurb: string;
  /** Visual revealed on hover (image path under /public). */
  image: string;
  tags: string[];
};

export type Award = {
  title: string;
  org: string;
  year: string;
};

export type Stat = {
  value: number;
  suffix?: string;
  label: string;
};

export type SocialLink = { label: string; href: string };
export type NavLink = { label: string; href: string };

export const theme = {
  /* ── Identity ─────────────────────────────────────────────────────────── */
  studio: {
    name: "STUDIO",
    /** Used in the browser tab + OG. */
    fullName: "Studio — Creative & Design Practice",
    tagline: "We design the future",
    role: "Independent design & motion studio",
    location: "New York — Berlin",
    /** IANA timezone for the footer local-time clock. */
    timezone: "America/New_York",
    email: "hello@studio.com",
    /** Short manifesto — words highlight in accent as they scroll into view. */
    manifesto:
      "We are a design and motion studio building the visual language of tomorrow's brands. We blend editorial restraint with kinetic energy, engineering every pixel and every frame so the work feels inevitable — expensive, precise, alive.",
  },

  /* ── Palette ──────────────────────────────────────────────────────────────
   *  Near-black canvas, off-white ink, ONE electric accent.
   *  The accent is used ONLY for the cursor, hovers and small marks. Restraint. */
  palette: {
    bg: "#0B0B0D", // near-black canvas
    surface: "#141417", // raised panels / gallery bg
    text: "#EDEBE7", // off-white ink
    muted: "#6E6E73", // secondary text / meta
    line: "#26262A", // hairline rules
    accent: "#C8FF3D", // ← THE one accent (default: acid green)
    accentInk: "#0B0B0D", // text colour that sits on the accent
  },

  /* ── Cursor ───────────────────────────────────────────────────────────── */
  cursor: {
    /** Base diameter (px) of the trailing dot. */
    size: 14,
    /** Diameter when hovering an interactive/label target. */
    hoverSize: 84,
    /** Lerp factor 0–1 — lower = more trailing lag. */
    ease: 0.16,
    labels: {
      view: "View",
      drag: "Drag",
    },
  },

  /* ── Navigation ───────────────────────────────────────────────────────── */
  nav: [
    { label: "Work", href: "#work" },
    { label: "Studio", href: "#about" },
    { label: "Services", href: "#services" },
    { label: "Contact", href: "#contact" },
  ] as NavLink[],

  /* ── Hero ─────────────────────────────────────────────────────────────── */
  hero: {
    /** Each string is one masked line of the kinetic headline. */
    headline: ["We design", "the future"],
    subline: "Design · Motion · Interactive · 3D",
    /** Masked video loop behind/beside the type. */
    video: "/featured/featured-1.mp4",
    poster: "/hero/hero.jpeg",
    scrollCue: "Scroll",
  },

  /* ── Selected Work (horizontal gallery) ───────────────────────────────── */
  projects: [
    {
      id: "aurora",
      index: "01",
      title: "Aurora",
      category: "Brand · WebGL",
      year: "2025",
      image: "/projects/project-1.jpeg",
      description: "A living identity for a next-gen energy company.",
    },
    {
      id: "monolith",
      index: "02",
      title: "Monolith",
      category: "Art Direction · 3D",
      year: "2025",
      image: "/projects/project-2.jpeg",
      description: "Sculpting light for a luxury hardware launch.",
    },
    {
      id: "cascade",
      index: "03",
      title: "Cascade",
      category: "Digital · Motion",
      year: "2024",
      image: "/projects/project-3.jpeg",
      description: "An immersive product story told in one scroll.",
    },
    {
      id: "prism",
      index: "04",
      title: "Prism",
      category: "Identity · Web",
      year: "2024",
      image: "/projects/project-4.jpeg",
      description: "Refracting a fintech brand into pure signal.",
    },
    {
      id: "helix",
      index: "05",
      title: "Helix",
      category: "Campaign · 3D",
      year: "2024",
      image: "/projects/project-5.jpeg",
      description: "A generative campaign that never repeats.",
    },
    {
      id: "vantage",
      index: "06",
      title: "Vantage",
      category: "Platform · Interactive",
      year: "2023",
      image: "/projects/project-6.jpeg",
      description: "Rebuilding how a studio shows its own work.",
    },
  ] as Project[],

  /* ── Featured project spotlight ───────────────────────────────────────── */
  spotlight: {
    eyebrow: "Featured",
    title: "Monolith",
    category: "Art Direction · 3D · Film",
    year: "2025",
    video: "/featured/featured-2.mp4",
    poster: "/projects/project-2.jpeg",
    copy:
      "A full-sensory launch film for a luxury hardware brand — chrome, light and gravity choreographed frame by frame.",
    nextHint: "Next — Cascade",
  },

  /* ── Services / capabilities ──────────────────────────────────────────── */
  services: [
    {
      title: "Design",
      blurb: "Brand systems, art direction and editorial identity built to last.",
      image: "/projects/project-4.jpeg",
      tags: ["Identity", "Art Direction", "Editorial"],
    },
    {
      title: "Motion",
      blurb: "Film, title design and kinetic systems that give a brand a pulse.",
      image: "/projects/project-3.jpeg",
      tags: ["Film", "Title Design", "Kinetic"],
    },
    {
      title: "3D",
      blurb: "Real-time and rendered worlds — product, environment and light.",
      image: "/projects/project-5.jpeg",
      tags: ["Real-time", "Product", "Environment"],
    },
    {
      title: "Development",
      blurb: "WebGL, creative front-end and the engineering behind the feeling.",
      image: "/projects/project-6.jpeg",
      tags: ["WebGL", "Front-end", "Interaction"],
    },
  ] as Service[],

  /* ── About / team ─────────────────────────────────────────────────────── */
  about: {
    heading: "A small studio with a long reach.",
    body: [
      "Studio is an independent design and motion practice working with brands who refuse to look like everyone else. We are deliberately small — a tight group of directors, designers and engineers who touch every project end to end.",
      "We believe restraint is a feature. The best work knows when to be loud and when to disappear. We obsess over rhythm, weight and timing until the whole thing feels inevitable.",
    ],
    clients: [
      "Nebula",
      "Form",
      "Atelier",
      "Vector",
      "Kinetic",
      "Northwind",
      "Obscura",
      "Meridian",
    ],
    stats: [
      { value: 12, suffix: "+", label: "Years in practice" },
      { value: 48, suffix: "", label: "Awards & mentions" },
      { value: 90, suffix: "+", label: "Brands shipped" },
      { value: 6, suffix: "", label: "Humans in the studio" },
    ] as Stat[],
  },

  /* ── Awards / recognition ─────────────────────────────────────────────── */
  awards: [
    { title: "Site of the Day", org: "Awwwards", year: "2025" },
    { title: "Site of the Day", org: "FWA", year: "2025" },
    { title: "Developer Award", org: "Awwwards", year: "2024" },
    { title: "Best Motion", org: "CSSDA", year: "2024" },
    { title: "Design of the Year", org: "The FWA", year: "2023" },
  ] as Award[],

  /* ── Contact / footer ─────────────────────────────────────────────────── */
  contact: {
    heading: "Let's talk",
    sub: "Have a project in mind? We'd love to hear about it.",
    email: "hello@studio.com",
    buttonLabel: "Start a project",
  },

  socials: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Behance", href: "https://behance.net" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "X / Twitter", href: "https://x.com" },
  ] as SocialLink[],

  footer: {
    credit: "Built with Studio",
    year: new Date().getFullYear(),
  },
} as const;

export type Theme = typeof theme;
