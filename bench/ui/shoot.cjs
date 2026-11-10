// Usage: node bench/ui/shoot.cjs <url-or-html-path> <name> [--dark]
// Writes bench/ui/shots/<name>-desktop.png (1360x960) and <name>-phone.png (390x844), both full page.
const { createRequire } = require("node:module");
const path = require("node:path");
const { chromium } = createRequire(
  path.resolve(__dirname, "../../apps/web/package.json"),
)("@playwright/test");

(async () => {
  const [, , target, name, flag] = process.argv;
  const url = /^https?:/.test(target)
    ? target
    : "file://" + path.resolve(target);
  const browser = await chromium.launch();
  for (const [size, viewport] of [
    ["desktop", { width: 1360, height: 960 }],
    ["phone", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 2,
      colorScheme: flag === "--dark" ? "dark" : "light",
    });
    await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
    const suffix = flag === "--dark" ? "-dark" : "";
    await page.screenshot({
      path: path.join(__dirname, "shots", `${name}-${size}${suffix}.png`),
      fullPage: true,
    });
    await page.close();
  }
  await browser.close();
})();
