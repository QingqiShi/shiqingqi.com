import { describe, expect, it } from "vitest";
import { mailFrameDocument } from "./mail-frame-document.ts";

const imageLinks = {
  origin: "https://assistant.example",
  link: (url: string) =>
    `https://assistant.example/api/mail-image?u=${encodeURIComponent(url)}&s=x`,
};

function mailPart(html: string) {
  return (
    mailFrameDocument(html, [], imageLinks).document.split("</head>")[1] ?? ""
  );
}

describe("mailFrameDocument", () => {
  it("leaves no tag of the mail that loads from the network past the CSP", () => {
    const attacks = [
      '<link rel="preconnect" href="https://open-123.tracker.example" crossorigin>',
      '<<meta>meta http-equiv="refresh" content="0;url=https://tracker.example">',
      '<<link>link rel=dns-prefetch href="//tracker.example">',
      "<svg><style><meta http-equiv=refresh content=0;url=https://tracker.example></style></svg>",
      '<iframe srcdoc="&lt;link rel=preconnect href=https://tracker.example&gt;"></iframe>',
    ];

    for (const attack of attacks) {
      expect(mailPart(attack)).not.toMatch(/<(?:meta|link|base|iframe)\b/i);
    }
  });

  it("drops the mail's own head tags without showing them", () => {
    expect(mailPart('<meta charset="utf-8"><p>Hello</p>')).not.toContain(
      "&lt;",
    );
  });

  it("drops replacement characters that sit between tags and keeps those in text", () => {
    const part = mailPart(
      "<table>\n<tr>\n\uFFFD\uFFFD\uFFFD <td>Caf\uFFFD</td>\n\uFFFD\uFFFD </tr>\n</table>",
    );

    expect(part).toContain("<tr>\n <td>Caf\uFFFD</td>\n </tr>");
    expect(part.match(/\uFFFD/g)).toHaveLength(1);
  });

  it("loads web images through the app's image route only", () => {
    const frame = mailFrameDocument(
      '<img src="https://cdn.example/a.png?x=1&amp;y=2" srcset="https://cdn.example/a@2x.png 2x" width="600">' +
        '<table><tr><td background="//cdn.example/bg.jpg">',
      [],
      imageLinks,
    );
    const document = new DOMParser().parseFromString(
      frame.document,
      "text/html",
    );
    const imageUrl = new URL(
      document.querySelector("img")?.getAttribute("src") ?? "",
    );
    const backgroundUrl = new URL(
      document.querySelector("td")?.getAttribute("background") ?? "",
    );
    const csp =
      document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute("content") ?? "";
    const imageSources = csp
      .split(";")
      .map((directive) => directive.trim().split(/\s+/))
      .find(([name]) => name === "img-src")
      ?.slice(1);

    expect(imageUrl.origin + imageUrl.pathname).toBe(
      "https://assistant.example/api/mail-image",
    );
    expect(decodeURIComponent(imageUrl.searchParams.get("u") ?? "")).toBe(
      "https://cdn.example/a.png?x=1&y=2",
    );
    expect(document.querySelector("img")?.hasAttribute("srcset")).toBe(false);
    expect(backgroundUrl.pathname).toBe("/api/mail-image");
    expect(imageSources).toEqual([
      "data:",
      "https://assistant.example/api/mail-image",
    ]);
    expect(frame.proxiedImages).toBe(2);
  });

  it("takes out tracking pixels and counts them", () => {
    const frame = mailFrameDocument(
      '<p>Hi<img src="https://shop.example/open.gif?id=7" width="1" height="1"></p>' +
        '<img src="https://trk.klaviyomail.com/o/abc.png" width="600" height="300">',
      [],
      imageLinks,
    );

    expect(frame.document).not.toContain("<img");
    expect(frame.blockedTrackers).toBe(2);
    expect(frame.proxiedImages).toBe(0);
  });

  it("takes linear time on crafted mail up to 1 MB", () => {
    const crafted = {
      cssUrlSpaces: (size: number) =>
        `<style>p{background:url(${" ".repeat(size)}</style>`,
      manyCssUrls: (size: number) =>
        `<style>p{background:${"url(".repeat(size / 4)}</style>`,
      manyUnclosedTags: (size: number) => "<meta<a".repeat(size / 7),
      linkTagSpaces: (size: number) => `<a${" ".repeat(size)}>`,
      replacementCharRun: (size: number) => `>${" \uFFFD".repeat(size / 2)}`,
      nestedTags: (size: number) =>
        "<div>".repeat(size / 5) + "</span>".repeat(size / 7),
    };
    const fastestRun = (html: string) =>
      Math.min(
        ...Array.from({ length: 3 }, () => {
          const started = performance.now();
          mailFrameDocument(html, [], imageLinks);
          return performance.now() - started;
        }),
      );

    // Wall-clock budgets fail on slow CI runners, so compare 1 MB with 128 KB:
    // linear time gives a ratio near 8, quadratic time near 64.
    const small = 128 * 1024;
    for (const [shape, craft] of Object.entries(crafted)) {
      const smallTime = Math.max(fastestRun(craft(small)), 1);
      const largeTime = fastestRun(craft(small * 8));
      expect(largeTime / smallTime, shape).toBeLessThan(24);
    }
  });

  it("counts web images that cannot load without image links", () => {
    const frame = mailFrameDocument(
      '<img src="https://cdn.example/a.png" width="600"><p style="background:url(https://cdn.example/b.png)">',
      [],
      null,
    );

    expect(frame.unloadedImages).toBe(2);
    expect(frame.proxiedImages).toBe(0);
  });
});
