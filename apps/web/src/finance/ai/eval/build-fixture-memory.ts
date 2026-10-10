import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import type { LabelMemory } from "../types.ts";
import { categoriseFixture } from "./categorise-fixture.ts";

export const FIXTURE_ACCOUNT_ID = nameBasedUuid("fixture:account:current");

/** The fixture as Label memory with UUID ids, plus the map from category key to id. */
export function buildFixtureMemory() {
  const categoryId = (key: string) => nameBasedUuid(`fixture:category:${key}`);
  const payeeId = (name: string) => nameBasedUuid(`fixture:payee:${name}`);
  const memory: LabelMemory = {
    baseCurrency: "GBP",
    categories: categoriseFixture.categories.map((category) => ({
      id: categoryId(category.key),
      parentId: category.parent ? categoryId(category.parent) : null,
      kind: category.kind,
      name: category.name,
    })),
    tags: categoriseFixture.tags.map((name) => ({
      id: nameBasedUuid(`fixture:tag:${name}`),
      name,
    })),
    members: [{ id: nameBasedUuid("fixture:member"), name: "Alex" }],
    accounts: [
      {
        id: FIXTURE_ACCOUNT_ID,
        name: "Current",
        kind: "cash",
        currency: "GBP",
        ownerMemberId: null,
      },
    ],
    payees: categoriseFixture.history.map((past) => ({
      id: payeeId(past.payee),
      name: past.payee,
      defaultCategoryId: null,
    })),
    aliases: categoriseFixture.history.flatMap((past) =>
      (past.aliases ?? []).map((alias) => ({
        alias,
        payeeId: payeeId(past.payee),
      })),
    ),
    transactions: categoriseFixture.history.map((past, index) => ({
      id: nameBasedUuid(`fixture:transaction:${String(index)}`),
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      kind: "expense",
      amountMinor: past.amountMinor,
      payeeId: payeeId(past.payee),
      categoryId: categoryId(past.category),
      memberId: null,
      tagIds: [],
      accountIds: [FIXTURE_ACCOUNT_ID],
    })),
  };
  return { memory, categoryId, payeeId };
}
