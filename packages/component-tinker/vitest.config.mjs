import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// The tinker build makes its own Vite config in
// `scripts/tinker-vite-config.mjs`, so Vitest reads this file instead. The
// alias mirrors that one's so a test can import an example config, which
// imports itself as `@tuja/component-tinker`.
export default defineConfig({
  resolve: {
    alias: {
      "@tuja/component-tinker": path.join(root, "src/core/index.ts"),
    },
  },
  test: {
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,tsx}"],
    exclude: ["**/node_modules/**"],
  },
});
