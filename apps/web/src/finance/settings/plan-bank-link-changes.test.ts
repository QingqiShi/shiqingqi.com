import { describe, expect, it } from "vitest";
import type { ProviderAccountView } from "../bank/types.ts";
import { planBankLinkChanges } from "./plan-bank-link-changes.ts";

function view(
  id: string,
  link: { id: string; accountId: string; sign?: 1 | -1 } | null,
): ProviderAccountView {
  return {
    providerAccountId: id,
    name: id,
    institution: "",
    institutionLogo: null,
    currency: "GBP",
    needsReconnect: false,
    link:
      link === null
        ? null
        : {
            id: link.id,
            accountId: link.accountId,
            signMultiplier: link.sign ?? 1,
            status: "active",
            lastSyncedOn: null,
            lastSyncAt: null,
            lastError: null,
          },
  };
}

describe("planBankLinkChanges", () => {
  it("links, unlinks, flips the sign and leaves unchanged links alone", () => {
    const plan = planBankLinkChanges(
      [
        view("new", null),
        view("gone", { id: "l1", accountId: "a1" }),
        view("flip", { id: "l2", accountId: "a2" }),
        view("same", { id: "l3", accountId: "a3" }),
      ],
      new Map([
        ["new", { accountId: "a4", flipped: false }],
        ["gone", { accountId: "", flipped: false }],
        ["flip", { accountId: "a2", flipped: true }],
        ["same", { accountId: "a3", flipped: false }],
      ]),
    );
    expect(plan).toEqual({
      removals: ["l1"],
      puts: [
        { accountId: "a4", providerAccountId: "new", signMultiplier: 1 },
        { accountId: "a2", providerAccountId: "flip", signMultiplier: -1 },
      ],
    });
  });

  it("frees a provider account before it feeds another account", () => {
    const plan = planBankLinkChanges(
      [view("p1", { id: "l1", accountId: "a1" })],
      new Map([["p1", { accountId: "a2", flipped: false }]]),
    );
    expect(plan).toEqual({
      removals: ["l1"],
      puts: [{ accountId: "a2", providerAccountId: "p1", signMultiplier: 1 }],
    });
  });
});
