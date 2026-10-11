import { afterEach, describe, expect, it, vi } from "vitest";
import { getFinanceEmailSender } from "./get-finance-email-sender.ts";

describe("getFinanceEmailSender", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function stubEnv(env: Record<string, string>) {
    vi.stubEnv("FINANCE_EMAIL_OUTBOX", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("FINANCE_EMAIL_FROM", "");
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  }

  it("falls back to a local outbox in development with no email config", () => {
    stubEnv({ NODE_ENV: "development" });
    expect(getFinanceEmailSender()).not.toBeNull();
  });

  it.each(["production", "test"])(
    "sends no email in %s with no email config",
    (nodeEnv) => {
      stubEnv({ NODE_ENV: nodeEnv });
      expect(getFinanceEmailSender()).toBeNull();
    },
  );

  it("sends through Resend when it is configured, even in development", () => {
    stubEnv({
      NODE_ENV: "development",
      RESEND_API_KEY: "key",
      FINANCE_EMAIL_FROM: "Finance <finance@example.com>",
    });
    expect(getFinanceEmailSender()).not.toBeNull();
  });
});
