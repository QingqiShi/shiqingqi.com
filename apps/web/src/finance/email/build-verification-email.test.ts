import { describe, expect, it } from "vitest";
import { buildVerificationEmail } from "./build-verification-email.ts";

describe.each(["en", "zh"] as const)(
  "buildVerificationEmail in %s",
  (locale) => {
    const url = "https://example.com/finance/verify-email/a1?x=1&y=2";
    const email = buildVerificationEmail({
      to: "qingqi@example.com",
      locale,
      url,
    });

    it("has an HTML body and a plain-text alternative with the link", () => {
      expect(email.text).toContain(url);
      expect(email.html).toMatch(/^<!DOCTYPE html>/);
      expect(email.html).toContain(
        'href="https://example.com/finance/verify-email/a1?x=1&amp;y=2"',
      );
      expect(email.html).toContain(
        `lang="${locale === "zh" ? "zh-CN" : "en"}"`,
      );
    });
  },
);
