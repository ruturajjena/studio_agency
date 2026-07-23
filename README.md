# STUDIO — Premium Agency & Portfolio Theme

A futuristic, editorial, heavily scroll-animated Next.js theme for design & motion studios. Custom cursor, WebGL image hover-distortion, pinned horizontal-scroll gallery, kinetic type, curtain page-transitions — built to the Awwwards / FWA bar.

Everything a buyer changes lives in **one file**: [`config/theme.ts`](config/theme.ts).

---

## Stack

| Concern | Tool |
| --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript |
| Layout | Tailwind (layout utilities only — typography is bespoke) |
| Smooth scroll | [`lenis`](https://github.com/darkroomengineering/lenis) |
| Reveals / scroll progress | `framer-motion` |
| WebGL distortion | `three` + `@react-three/fiber` + `@react-three/drei` + custom GLSL |
| Icons | `lucide-react` (used sparingly) |

---

## Quick start

```bash
npm install          # add --legacy-peer-deps if your npm is strict about R3F peers
npm run dev          # http://localhost:3000
npm run build        # production build
npm start            # serve the production build
```

`npm run dev` shows: preloader → kinetic hero → manifesto → horizontal WebGL gallery → spotlight → services → about → awards → contact → footer.

---

## Rebranding — everything is in `config/theme.ts`

Open [`config/theme.ts`](config/theme.ts). No other file needs editing for a standard rebrand.

### 1. Studio identity
```ts
studio: {
  name: "STUDIO",
  tagline: "We design the future",
  email: "hello@studio.com",
  timezone: "America/New_York",   // drives the footer local-time clock
  manifesto: "…",                  // the word-by-word highlight paragraph
}
```

### 2. Change the accent colour (one value)
```ts
palette: {
  accent: "#C8FF3D",     // ← the ONE electric accent (cursor, hovers, marks)
  // bg, surface, text, muted, line, accentInk are here too
}
```
The accent flows to the cursor, the WebGL shader bloom, hover states and every small mark automatically (it's injected as a CSS variable).

### 3. Swap in your own projects
Two steps:

1. Drop your images/videos into `public/projects/` (and `public/featured/`).
2. Edit the `projects` array:

```ts
projects: [
  {
    id: "aurora",
    index: "01",
    title: "Aurora",
    category: "Brand · WebGL",
    year: "2025",
    image: "/projects/project-1.jpeg", // used as the WebGL texture + <img> fallback
    video: "/projects/aurora.mp4",      // optional
    description: "A living identity for a next-gen energy company.",
  },
  // …add as many as you like — the horizontal gallery + grid adapt automatically
]
```

The horizontal gallery, the touch swipe strip and the reduced-motion grid all read from this one array. Add or remove entries freely.

### 4. Everything else
`nav`, `hero`, `spotlight`, `services`, `about` (bio, clients, stats), `awards`, `contact`, `socials`, `footer` are all plain data in the same file.

---

## Fonts — swap to Clash Display / Neue Montreal (optional)

The theme ships with two variable Google faces that get very close to the Clash Display / Neue Montreal feel with zero licensing:

- **Display** → Bricolage Grotesque
- **Body** → Space Grotesk

To use the real thing:

1. Drop the `.woff2` files into `app/fonts/`.
2. In [`app/layout.tsx`](app/layout.tsx), replace the two `next/font/google` calls with `next/font/local`, keeping the **same CSS variable names** (`--font-display`, `--font-sans`).

Nothing else changes — the whole type system reads from those variables.

---

## Signature elements & where they live

| Feature | File |
| --- | --- |
| Custom cursor (scales / "View" · "Drag" / inverts) | [`components/Cursor.tsx`](components/Cursor.tsx) |
| WebGL hover-distortion (GLSL) | [`components/gl/`](components/gl/) · [`shaders/distortion.ts`](shaders/distortion.ts) |
| Horizontal-scroll gallery | [`components/sections/Work.tsx`](components/sections/Work.tsx) |
| Kinetic type / scroll-velocity hero | [`components/sections/Hero.tsx`](components/sections/Hero.tsx) · [`components/motion/`](components/motion/) |
| Curtain page-transition | [`components/PageCurtain.tsx`](components/PageCurtain.tsx) |
| Smooth scroll (Lenis) | [`components/providers/SmoothScroll.tsx`](components/providers/SmoothScroll.tsx) |

Sections live under [`components/sections/`](components/sections/), WebGL under [`components/gl/`](components/gl/), shaders in [`shaders/`](shaders/).

---

## Motion & accessibility

- Everything is synced through the single Lenis scroll instance.
- **`prefers-reduced-motion`** is fully honoured: Lenis, the custom cursor, the WebGL distortion and the curtains all switch off, leaving clean fades and native scroll.
- **Touch devices**: the custom cursor is disabled and the horizontal gallery becomes a native swipe strip.

To interrupt cursor behaviour on any element, use the data attributes:
`data-cursor="view"`, `data-cursor="drag"`, `data-cursor="hover"`.

---

## Performance notes

- All WebGL is `dynamic()`-imported with `ssr: false` and only mounted while a tile is **on screen** (IntersectionObserver) — off-screen tiles keep no GL context.
- Device pixel ratio is capped at 2.
- Videos are `muted` / `playsInline` / `loop`, `preload="none"`, and the spotlight video plays only while in view.
- Images are lazy-loaded and act as WebGL posters/fallbacks.

---

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com/new), **Import** the repository.
3. Framework preset auto-detects **Next.js** — no config needed. Build command `next build`, output handled automatically.
4. Deploy. Your studio is live.

> Tip: put large source videos through compression before committing, or host them on a CDN and point the `video` paths in `theme.ts` at the CDN URLs.

---

## Project structure

```
app/
  layout.tsx         # fonts + <ThemeStyle/> (palette → CSS vars)
  page.tsx           # section composition + providers
  globals.css        # bespoke fluid type scale, reduced-motion
config/
  theme.ts           # ← SINGLE SOURCE OF TRUTH (rebrand here)
components/
  Cursor.tsx  Preloader.tsx  Nav.tsx  PageCurtain.tsx  ScrollProgress.tsx
  providers/SmoothScroll.tsx
  motion/            # MaskReveal, Rise, Marquee, MagneticButton
  gl/                # DistortionImage (lazy) + DistortionPlane (R3F)
  sections/          # Hero → Footer
shaders/
  distortion.ts      # vertex + fragment GLSL
lib/
  hooks.ts           # reduced-motion, touch, media-query, local-time
public/
  projects/  featured/  hero/
```

---

Built with **Studio**.
