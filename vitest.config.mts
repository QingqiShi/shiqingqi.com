import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import react from "@vitejs/plugin-react";
import babel from "vite-plugin-babel";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        configFile: true,
      },
      filter: /src\/.*\.(tsx?|jsx?)$/,
      enforce: "pre",
    }),
    react({
      jsxRuntime: "automatic",
    }),
  ],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: "chromium" },
      ],
    },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}", "tooling/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "*.config.{js,ts}",
        "**/*.d.ts",
        "**/*.types.ts",
        "**/types.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
