import { describe, expect, it } from "vitest";
import { buildRecoveryEmail } from "./build-recovery-email.ts";

const HOSTILE_NAME = `<img src=x onerror="alert('x')"> & Co`;

describe.each(["en", "zh"] as const)("buildRecoveryEmail in %s", (locale) => {
  const email = buildRecoveryEmail({
    to: "qingqi@example.com",
    locale,
    code: "042917",
    links: [
      { householdName: "Home", url: "https://example.com/finance/invite/a1" },
      {
        householdName: HOSTILE_NAME,
        url: "https://example.com/finance/invite/b2?x=1&y=2",
      },
    ],
  });

  it("has an HTML body and a plain-text alternative with every link", () => {
    expect(email.text).toContain("Home\nhttps://example.com/finance/invite/a1");
    expect(email.text).toContain(
      `${HOSTILE_NAME}\nhttps://example.com/finance/invite/b2?x=1&y=2`,
    );
    expect(email.html).toMatch(/^<!DOCTYPE html>/);
    expect(email.html).toContain(
      'href="https://example.com/finance/invite/a1"',
    );
    expect(email.html).toContain(
      'href="https://example.com/finance/invite/b2?x=1&amp;y=2"',
    );
    expect(email.html).toContain(`<title>${email.subject}</title>`);
  });

  it("leads with the code, in the subject and above the links", () => {
    expect(email.subject).toContain("042917");
    expect(email.text.indexOf("\n042917\n")).toBeGreaterThan(0);
    expect(email.text.indexOf("042917")).toBeLessThan(
      email.text.indexOf("https://"),
    );
    expect(email.html.indexOf(">042917</p>")).toBeLessThan(
      email.html.indexOf('href="https://'),
    );
  });

  it("escapes the household name in the HTML", () => {
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; Co",
    );
  });
});
