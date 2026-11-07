import { describe, expect, it } from "vitest";
import { rewriteMailImages } from "./rewrite-mail-images.ts";

const link = (url: string) => `https://assistant.example/img?u=${url}`;

describe("rewriteMailImages", () => {
  it("takes out a tracker URL and proxies a plain one", () => {
    const html =
      '<img src="https://x.example/e/FooterImages/FooterImage1.gif" width="200"><img src="https://x.example/a.png" width="200">';
    const result = rewriteMailImages(html, link);
    expect(result.trackers).toBe(1);
    expect(result.proxied).toBe(1);
  });

  it("stays fast on a mail of many long URLs that match no tracker", () => {
    const url = `https://example.com/${"a".repeat(4000)}`;
    const count = 1000;
    const html = Array.from(
      { length: count },
      (_, index) => `<img src="${url}${String(index)}" width="200">`,
    ).join("");

    const started = performance.now();
    const result = rewriteMailImages(html, link);

    expect(performance.now() - started).toBeLessThan(200);
    expect(result.proxied).toBeGreaterThan(0);
    expect(result.proxied).toBeLessThan(count);
  });
});
