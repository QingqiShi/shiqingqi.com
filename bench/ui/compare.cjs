// Usage: node bench/ui/compare.cjs <screen> <prefix> [suffix]
// Writes bench/ui/shots/compare-<prefix>-<screen>.png: ours and shadcn side by side, desktop and phone.
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const { chromium } = createRequire(
  path.resolve(__dirname, "../../apps/web/package.json"),
)("@playwright/test");

(async () => {
  const [, , screen, prefix, suffix = ""] = process.argv;
  const shots = path.join(__dirname, "shots");
  const img = (stack, size) =>
    `file://${shots}/${stack}-${screen}-${size}${suffix}.png`;
  const cell = (label, src, width) =>
    `<figure><figcaption>${label}</figcaption><img src="${src}" style="width:${width}px"></figure>`;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:16px;background:#fff;font:600 16px system-ui;display:flex;gap:20px;align-items:flex-start}
    figure{margin:0} figcaption{padding:0 0 8px} img{display:block;border:1px solid #ccc}
  </style>
  ${cell(`${prefix} desktop`, img(prefix, "desktop"), 1020)}
  ${cell("shadcn desktop", img("shadcn", "desktop"), 1020)}
  ${cell(`${prefix} phone`, img(prefix, "phone"), 293)}
  ${cell("shadcn phone", img("shadcn", "phone"), 293)}`;
  const file = path.join(shots, `compare-${prefix}-${screen}.html`);
  fs.writeFileSync(file, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 2750, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto("file://" + file);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(shots, `compare-${prefix}-${screen}.png`),
    fullPage: true,
  });
  await browser.close();
  fs.unlinkSync(file);
})();
