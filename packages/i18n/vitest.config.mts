import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    conditions: ["test", ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: ["test", ...defaultServerConditions],
    },
  },
});
