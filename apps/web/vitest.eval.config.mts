import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/ai-chat/eval/**/*.eval.ts"],
    testTimeout: 120_000,
    maxWorkers: 1,
    setupFiles: ["./src/ai-chat/eval/setup.ts"],
  },
  resolve: {
    alias: {
      "#src": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test-stubs/server-only.ts"),
    },
  },
});
