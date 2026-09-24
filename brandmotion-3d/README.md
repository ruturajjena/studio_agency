# BrandMotion — Fractured Core (3D hero)

A faceted obsidian core split into Voronoi shards that breathe apart and leak light from a glowing heart, floating over a slow, contour-lined night sea. Deep-navy palette, white-blue glow, bloom.

- **Pointer**: camera parallax, the core turns toward the cursor and opens wider when hovered.
- **Intro**: shards fly in and assemble on load.
- Pauses when off-screen; honours `prefers-reduced-motion`.

## Use

**Plain HTML** — serve this folder and open `index.html` (three.js is loaded from jsDelivr via an import map).

**Next.js / React** — `components/gl/BrandMotionScene.tsx` wraps it; preview at `/brandmotion`.

**Any other site** — import `createBrandMotionScene(canvas, { reducedMotion })` from `scene.js` (needs `three@0.169`). It returns `{ dispose }`.

Colours live in `PALETTE` at the top of `scene.js`.
