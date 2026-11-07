import { describe, expect, it } from "vitest";
import { mailFrameDocument } from "./mail-frame-document.ts";

function mailPart(html: string) {
  return mailFrameDocument(html, []).split("</head>")[1] ?? "";
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
});
