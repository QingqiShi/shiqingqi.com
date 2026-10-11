import { describe, expect, it } from "vitest";
import { getLocalFinanceDefaults } from "./get-local-finance-defaults.ts";

describe("getLocalFinanceDefaults", () => {
  it("adds every local setting when the developer set none", () => {
    expect(getLocalFinanceDefaults({}, 5433)).toEqual({
      FINANCE_DATABASE_URL:
        "postgres://postgres:postgres@127.0.0.1:5433/postgres",
      FINANCE_AUTH_SECRET: "local-finance-auth-secret",
      FINANCE_SETUP_SECRET: "local-finance-setup-secret",
      FINANCE_LUNCHFLOW_MODE: "fake",
      FINANCE_RATE_LIMIT: "off",
    });
  });

  it("keeps a setting that the developer set", () => {
    const defaults = getLocalFinanceDefaults(
      { FINANCE_SETUP_SECRET: "mine", FINANCE_RATE_LIMIT: "" },
      5433,
    );
    expect(defaults).not.toHaveProperty("FINANCE_SETUP_SECRET");
    expect(defaults).not.toHaveProperty("FINANCE_RATE_LIMIT");
    expect(defaults?.FINANCE_AUTH_SECRET).toBe("local-finance-auth-secret");
  });

  it("adds nothing when the developer set the database, also to an empty value", () => {
    expect(
      getLocalFinanceDefaults({ FINANCE_DATABASE_URL: "postgres://db" }, 5433),
    ).toBeNull();
    expect(
      getLocalFinanceDefaults({ FINANCE_DATABASE_URL: "" }, 5433),
    ).toBeNull();
  });
});
