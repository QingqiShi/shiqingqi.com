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

  it("takes linear time in the length of URLs that match no tracker", () => {
    /*
     * A CI runner can be 15 times slower than a laptop, so this test does
     * not compare a time with a fixed limit. It compares two times on the
     * same machine. URLs 4 times longer take approximately 4 times longer
     * in linear time and 16 times longer in quadratic time.
     */
    const short = mailOfImages(`https://example.com/${"a".repeat(500)}`, 100);
    const long = mailOfImages(`https://example.com/${"a".repeat(2000)}`, 100);
    let shortTime = Infinity;
    let longTime = Infinity;
    for (let run = 0; run < 5; run++) {
      shortTime = Math.min(shortTime, timeRewrite(short));
      longTime = Math.min(longTime, timeRewrite(long));
    }

    expect(longTime / shortTime).toBeLessThan(8);
  });

  it("leaves the images past its limit of one mail as they are", () => {
    const count = 1000;
    const result = rewriteMailImages(
      mailOfImages("https://example.com/a.png", count),
      link,
    );

    expect(result.proxied).toBeGreaterThan(0);
    expect(result.proxied).toBeLessThan(count);
  });
});

function mailOfImages(url: string, count: number) {
  return Array.from(
    { length: count },
    (_, index) => `<img src="${url}?${String(index)}" width="200">`,
  ).join("");
}

function timeRewrite(html: string) {
  const started = performance.now();
  rewriteMailImages(html, link);
  return performance.now() - started;
}
