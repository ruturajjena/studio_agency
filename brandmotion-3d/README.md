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

## 50 hero studies (`designs/`)

Fifty more interactive heroes, each a small module on a shared runtime. Every study is lit in the night palette and then colour-graded by a theme: `midnight` (original blue), single-hue `sunset`, `ember`, `gold`, `citrus`, `emerald`, `ocean`, `violet`, `rose`, two-tone `aurora`, `neon`, `tropic`, and spectral `prism`. Each study sets its default with `theme:`; the viewer's swatches switch it live (remembered per study in the browser).

- **Browse**: serve the repo (`npx serve .`) and open `/brandmotion-3d/designs/`. Click a study to view it full-screen; ← / → step through, Esc goes back.
- **Next.js**: `/brandmotion/01` … `/brandmotion/50`, or `<BrandMotionDesign id="07" theme="neon" />` (theme optional) from `components/gl/BrandMotionDesign.tsx`.
- **Anywhere else**: `createStage(canvas, design)` from `designs/stage.js`, with `design` being the default export of any `dNN.js`; pass `{ theme }` to override, and call `handle.setTheme(name)` to change it live. Themes live in `THEMES` in `stage.js`.
- **Add a study**: copy a `dNN.js` (the contract is documented at the top of `stage.js`), then run
  `node brandmotion-3d/tools/build.mjs` (manifest) and `node brandmotion-3d/tools/thumbs.mjs NN` (thumbnail).
  `tools/shot.mjs <outDir> NN` renders screenshots and reports console errors.
