import { describe, expect, it } from "vitest";
import { buildCodeEmail } from "./build-code-email.ts";

describe.each(["en", "zh"] as const)("buildCodeEmail in %s", (locale) => {
  const url = "https://example.com/finance/invite/b2?x=1&y=2";
  const email = buildCodeEmail({
    to: "qingqi@example.com",
    locale,
    code: "042917",
    url,
  });

  it("has an HTML body and a plain-text alternative with the link", () => {
    expect(email.text).toContain(url);
    expect(email.html).toMatch(/^<!DOCTYPE html>/);
    expect(email.html).toContain(
      'href="https://example.com/finance/invite/b2?x=1&amp;y=2"',
    );
    expect(email.html).toContain(`<title>${email.subject}</title>`);
    expect(email.html).toContain(`lang="${locale === "zh" ? "zh-CN" : "en"}"`);
  });

  it("leads with the code, in the subject and above the link", () => {
    expect(email.subject).toContain("042917");
    expect(email.text.indexOf("\n042917\n")).toBeGreaterThan(0);
    expect(email.text.indexOf("042917")).toBeLessThan(email.text.indexOf(url));
    expect(email.html.indexOf(">042917</p>")).toBeLessThan(
      email.html.indexOf('href="https://'),
    );
  });

  it("answers a sign-up request by saying to sign in, and never names a household", () => {
    const signUp = buildCodeEmail({
      to: "qingqi@example.com",
      locale,
      code: "482913",
      url,
      reason: "registered-sign-up",
    });
    expect(signUp.subject).toContain("482913");
    expect(signUp.text).toContain(url);
    expect(signUp.text).toMatch(locale === "zh" ? /登录/ : /Sign in/);
    expect(signUp.text).not.toMatch(/household|家庭(?!账本)/i);
  });

  it("signs up a new address with the code first and never names a household", () => {
    const signUp = buildCodeEmail({
      to: "qingqi@example.com",
      locale,
      code: "482913",
      url,
      reason: "sign-up",
    });
    expect(signUp.subject).toContain("482913");
    expect(signUp.text.indexOf("\n482913\n")).toBeGreaterThan(0);
    expect(signUp.text.indexOf("482913")).toBeLessThan(
      signUp.text.indexOf(url),
    );
    expect(signUp.text).not.toMatch(/household|家庭(?!账本)/i);
  });
});
