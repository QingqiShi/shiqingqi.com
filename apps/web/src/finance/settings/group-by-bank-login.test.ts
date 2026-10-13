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

function titlesAndIds(groups: ReturnType<typeof groupByBankLogin>) {
  return groups.map((group) => [
    group.title,
    group.accounts.map((member) => member.providerAccountId),
  ]);
}

describe("groupByBankLogin", () => {
  it("tells two logins at one bank apart by a name only one of them has, in Lunch Flow's order", () => {
    const groups = groupByBankLogin([
      account("42469", "26438", "richie rich", "Chase Bank"),
      account("42467", "26430", "Round-up", "Chase Bank"),
      account("42466", "26430", "What evs", "Chase Bank"),
      account("42465", "26430", "Qingqi's Account", "Chase Bank"),
      account("42464", "26430", "Emergency Fund", "Chase Bank"),
      account("42463", "26430", "Chase Saver", "Chase Bank"),
      account("42412", "26438", "Round-up", "Chase Bank"),
      account("42411", "26438", "Tong's Account", "Chase Bank"),
      account("42410", "26438", "Gold pot", "Chase Bank"),
      account("42001", "26195", "Account 1", "Barclays Personal"),
    ]);

    expect(titlesAndIds(groups)).toEqual([
      ["Chase Bank · richie rich", ["42469", "42412", "42411", "42410"]],
      ["Chase Bank · What evs", ["42467", "42466", "42465", "42464", "42463"]],
      ["Barclays Personal", ["42001"]],
    ]);
  });

  it("numbers a login whose account names another login at the same bank also has", () => {
    const groups = groupByBankLogin([
      account("1", "a", "Round-up", "Chase Bank"),
      account("2", "b", "Round-up", "Chase Bank"),
      account("3", "c", "Round-up", "Chase Bank"),
      account("4", "c", "Saver", "Chase Bank"),
    ]);

    expect(groups.map((group) => group.title)).toEqual([
      "Chase Bank (1)",
      "Chase Bank (2)",
      "Chase Bank · Saver",
    ]);
  });
});
