import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.eval.ts"],
    testTimeout: 120_000,
    maxWorkers: 1,
    silent: false,
    setupFiles: ["./src/eval/setup.ts"],
  },
  resolve: {
    conditions: ["test", ...defaultClientConditions],
    alias: {
      "#src": path.resolve(__dirname, "./src"),
      "server-only": require.resolve("@tuja/test-support/server-only-stub"),
    },
  },
  ssr: {
    resolve: {
      conditions: ["test", ...defaultServerConditions],
    },
  },
});
