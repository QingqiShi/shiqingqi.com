import fs from "node:fs";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);

/** `modern-normalize`, in the layer the app puts it in. */
export function normalizeCss() {
  const file = nodeRequire.resolve("modern-normalize/modern-normalize.css");
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return `@layer normalize {\n${css.trim()}\n}\n`;
}
