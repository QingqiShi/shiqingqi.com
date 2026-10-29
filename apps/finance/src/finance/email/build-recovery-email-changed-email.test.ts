import { describe, expect, it } from "vitest";
import {
  buildRecoveryEmailChangedEmail,
  maskEmail,
} from "./build-recovery-email-changed-email.ts";

describe("maskEmail", () => {
  it("keeps the first character of the local part and the domain", () => {
    expect(maskEmail("jane@example.com")).toBe("j•••@example.com");
    expect(maskEmail("j@example.com")).toBe("j•••@example.com");
  });
});

describe.each(["en", "zh"] as const)(
  "buildRecoveryEmailChangedEmail in %s",
  (locale) => {
    const url = "https://example.com/settings/members";
    const email = buildRecoveryEmailChangedEmail({
      to: "old@example.com",
      locale,
      newEmail: "jane@example.com",
      changedAt: new Date("2026-10-10T12:00:00Z"),
      timeZone: "Europe/London",
      settingsUrl: url,
    });

    it("names the new address only in part, and the time in the household's zone", () => {
      for (const body of [email.text, email.html]) {
        expect(body).toContain("j•••@example.com");
        expect(body).not.toContain("jane@");
        expect(body).toContain("13:00");
      }
    });
  },
);
