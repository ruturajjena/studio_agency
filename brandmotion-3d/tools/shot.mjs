/**
 * Render BrandMotion designs headlessly and save screenshots.
 *   node brandmotion-3d/tools/shot.mjs <outDir> 07 08 ...   (ids)
 * Prints any console errors / page errors per design. Serves the repo itself
 * and routes the three.js CDN to node_modules, so it works offline.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const [outDir, ...ids] = process.argv.slice(2);
const opts = { wait: +(process.env.WAIT || 4000), w: +(process.env.W || 960), h: +(process.env.H || 600) };
fs.mkdirSync(outDir, { recursive: true });

const types = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split(/[?#]/)[0]));
  fs.readFile(p, (err, buf) => {
    if (err) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" }).end(buf);
  });
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: opts.w, height: opts.h } });
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 500)));
  page.on("pageerror", (e) => errs.push(e.message.slice(0, 500)));
  await page.route("https://cdn.jsdelivr.net/npm/three@0.169.0/**", (r) => {
    const rel = new URL(r.request().url()).pathname.replace("/npm/three@0.169.0/", "");
    r.fulfill({ path: path.join(root, "node_modules/three", rel), contentType: "text/javascript" });
  });
  await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ body: "", contentType: "text/css" }));
  await page.goto(`http://localhost:${port}/brandmotion-3d/designs/index.html#${id}`);
  await page.waitForTimeout(opts.wait);
  await page.screenshot({ path: path.join(outDir, `d${id}.png`) });
  if (process.env.HOVER) {
    await page.mouse.move(opts.w * 0.62, opts.h * 0.4, { steps: 8 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, `d${id}-hover.png`) });
  }
  console.log(`d${id}: ${errs.length ? "ERRORS\n  " + errs.join("\n  ") : "ok"}`);
  await page.close();
}
await browser.close();
server.close();
