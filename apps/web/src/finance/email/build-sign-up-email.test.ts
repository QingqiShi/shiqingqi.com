import { describe, expect, it } from "vitest";
import { buildSignUpEmail } from "./build-sign-up-email.ts";

describe.each(["en", "zh"] as const)("buildSignUpEmail in %s", (locale) => {
  const url = "https://example.com/finance/sign-up/a1?x=1&y=2";
  const email = buildSignUpEmail({
    to: "qingqi@example.com",
    locale,
    code: "482913",
    url,
  });

  it("leads with the code and never names a household", () => {
    expect(email.subject).toContain("482913");
    expect(email.text.indexOf("\n482913\n")).toBeGreaterThan(0);
    expect(email.text.indexOf("482913")).toBeLessThan(email.text.indexOf(url));
    expect(email.text).not.toMatch(/household|家庭(?!账本)/i);
  });
});
