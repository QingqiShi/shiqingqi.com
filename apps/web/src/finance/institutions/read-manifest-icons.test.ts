import { describe, expect, it } from "vitest";
import { readManifestIcons } from "./read-manifest-icons.ts";

const PAGE = new URL("https://www.example.com/en/home");

describe("readManifestIcons", () => {
  it("resolves against the manifest and skips monochrome and SVG icons", () => {
    const icons = readManifestIcons(
      `\uFEFF${JSON.stringify({
        icons: [
          { src: "icon-512.png", sizes: "512x512", purpose: "any maskable" },
          { src: "mono.png", sizes: "1024x1024", purpose: "monochrome" },
          { src: "logo.svg", sizes: "any" },
          { src: 42 },
          null,
        ],
      })}`,
      new URL("https://example.com/app/manifest.json"),
    );
    expect(icons.map(({ url, size }) => [url.href, size])).toEqual([
      ["https://example.com/app/icon-512.png", 512],
    ]);
  });

  it("answers no icons for malformed JSON", () => {
    expect(readManifestIcons("<html>", PAGE)).toEqual([]);
    expect(readManifestIcons(`{"icons":"x"}`, PAGE)).toEqual([]);
  });
});
