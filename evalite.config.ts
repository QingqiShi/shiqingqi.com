import { defineConfig } from "evalite/config";

export default defineConfig({
  testTimeout: 60_000,
  maxConcurrency: 3,
  setupFiles: ["./src/ai-chat/eval/setup.ts"],
});
