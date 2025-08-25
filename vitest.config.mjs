import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
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
      "@/test": path.resolve(__dirname, "./src/test"),
      "@/breakpoints": path.resolve(
        __dirname,
        "./src/test/mocks/breakpoints.ts",
      ),
    },
  },
});
