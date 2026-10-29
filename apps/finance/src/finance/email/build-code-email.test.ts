import { describe, expect, it } from "vitest";
import { buildCodeEmail } from "./build-code-email.ts";

describe.each(["en", "zh"] as const)("buildCodeEmail in %s", (locale) => {
  it.each(["sign-up", "registered-sign-up"] as const)(
    "never names a household in a %s reply",
    (reason) => {
      const signUp = buildCodeEmail({
        to: "qingqi@example.com",
        locale,
        code: "482913",
        url: "https://example.com/invite/b2",
        reason,
      });
      expect(signUp.text).not.toMatch(/household|家庭(?!账本)/i);
    },
  );
});
