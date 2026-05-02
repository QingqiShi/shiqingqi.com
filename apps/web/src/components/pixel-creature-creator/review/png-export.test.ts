import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "../state/creature-schema";
import { exportCardPng, exportSpritePng } from "./png-export";

/**
 * jsdom ships with `OffscreenCanvas` but its 2D context is unimplemented —
 * `getContext("2d")` returns `null`, which our `makeCanvas` helper treats
 * as a fallback signal and creates a `<canvas>` instead. Likewise, the DOM
 * canvas in jsdom returns `null` from `getContext("2d")`, so the export
 * functions throw a clear "canvas is unavailable" error.
 *
 * That means jsdom can't produce a real Blob — we test the failure mode
 * here so the function shapes stay honest and rely on Playwright (real
 * Chromium with full Canvas2D support) to assert the happy-path Blob
 * round-trip in E2E.
 */

describe("png-export (jsdom canvas environment)", () => {
  it("exportSpritePng either resolves with a PNG Blob or surfaces a clear error", async () => {
    let blob: Blob | null = null;
    let error: unknown = null;
    try {
      blob = await exportSpritePng(DEFAULT_CREATURE, "idle");
    } catch (err) {
      error = err;
    }

    if (blob !== null) {
      // Real Canvas2D was available (modern jsdom build).
      expect(blob.type).toBe("image/png");
      expect(blob.size).toBeGreaterThan(0);
    } else {
      // Canvas2D isn't implemented — the helper must surface a readable error
      // rather than returning an empty / undefined value.
      expect(error).toBeInstanceOf(Error);
      const message = error instanceof Error ? error.message : "";
      expect(message).toMatch(/PNG export:/);
    }
  });

  it("exportCardPng either resolves with a PNG Blob or surfaces a clear error", async () => {
    let blob: Blob | null = null;
    let error: unknown = null;
    try {
      blob = await exportCardPng(DEFAULT_CREATURE, "joy", null, "en");
    } catch (err) {
      error = err;
    }

    if (blob !== null) {
      expect(blob.type).toBe("image/png");
      expect(blob.size).toBeGreaterThan(0);
    } else {
      expect(error).toBeInstanceOf(Error);
      const message = error instanceof Error ? error.message : "";
      expect(message).toMatch(/PNG export:/);
    }
  });
});
