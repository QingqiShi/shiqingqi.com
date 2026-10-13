import { describe, expect, it } from "vitest";
import type { ProviderAccountView } from "../bank/types.ts";
import { groupByBankLogin } from "./group-by-bank-login.ts";

function account(
  providerAccountId: string,
  bankLoginId: string,
  name: string,
  institution: string,
): ProviderAccountView {
  return {
    providerAccountId,
    bankLoginId,
    name,
    institution,
    institutionLogo: null,
    currency: "GBP",
    needsReconnect: false,
    link: null,
  };
}

describe("groupByBankLogin", () => {
  it("names a login after its first account only when another login is at the same institution", () => {
    const groups = groupByBankLogin([
      account("1", "26391", "Tong's Account", "Chase Bank"),
      account("2", "26391", "Round-up", "Chase Bank"),
      account("3", "26430", "Qingqi's Account", "Chase Bank"),
      account("4", "26195", "Account 1", "Barclays Personal"),
      account("5", "26430", "Round-up", "Chase Bank"),
    ]);

    expect(
      groups.map((group) => [
        group.title,
        group.accounts.map((member) => member.providerAccountId),
      ]),
    ).toEqual([
      ["Chase Bank · Tong's Account", ["1", "2"]],
      ["Chase Bank · Qingqi's Account", ["3", "5"]],
      ["Barclays Personal", ["4"]],
    ]);
  });
});
