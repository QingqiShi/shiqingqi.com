import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // PGlite starts in `beforeAll`. On a loaded CI runner, the start can take
    // more time than the 10 s default.
    hookTimeout: 120_000,
  },
});
