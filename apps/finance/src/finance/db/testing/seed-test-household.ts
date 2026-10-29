import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import {
  accountGroups,
  accounts,
  categories,
  households,
  members,
  payees,
  tags,
} from "../schema.ts";
import type { FinanceDb } from "../types.ts";

/**
 * A Household with two Members, two Groups, three accounts, two Categories,
 * two Payees and a Tag, all at version 0. Ids derive from `name`, so two
 * seeded Households never share an id.
 */
export async function seedTestHousehold(db: FinanceDb, name = "home") {
  const id = (key: string) => nameBasedUuid(`test:${name}:${key}`);
  const seeded = {
    householdId: id("household"),
    memberId: id("member"),
    partnerId: id("partner"),
    liquidGroupId: id("group:liquid"),
    creditGroupId: id("group:credit"),
    currentId: id("account:current"),
    savingsId: id("account:savings"),
    cardId: id("account:card"),
    groceriesId: id("category:groceries"),
    salaryId: id("category:salary"),
    grocerId: id("payee:grocer"),
    employerId: id("payee:employer"),
    trainTagId: id("tag:train"),
  };
  const householdId = seeded.householdId;
  await db.insert(households).values({ id: householdId, name });
  await db.insert(members).values([
    {
      id: seeded.memberId,
      householdId,
      name: "Qingqi",
      role: "owner",
      version: 0,
    },
    { id: seeded.partnerId, householdId, name: "Partner", version: 0 },
  ]);
  await db.insert(accountGroups).values([
    {
      id: seeded.liquidGroupId,
      householdId,
      name: "流动资产",
      side: "asset",
      version: 0,
    },
    {
      id: seeded.creditGroupId,
      householdId,
      name: "信用",
      side: "liability",
      version: 0,
    },
  ]);
  await db.insert(accounts).values([
    {
      id: seeded.currentId,
      householdId,
      groupId: seeded.liquidGroupId,
      name: "Current",
      kind: "cash",
      currency: "GBP",
      version: 0,
    },
    {
      id: seeded.savingsId,
      householdId,
      groupId: seeded.liquidGroupId,
      name: "Savings",
      kind: "cash",
      currency: "GBP",
      version: 0,
    },
    {
      id: seeded.cardId,
      householdId,
      groupId: seeded.creditGroupId,
      name: "Card",
      kind: "credit",
      currency: "GBP",
      version: 0,
    },
  ]);
  await db.insert(categories).values([
    {
      id: seeded.groceriesId,
      householdId,
      kind: "expense",
      name: "Groceries",
      version: 0,
    },
    {
      id: seeded.salaryId,
      householdId,
      kind: "income",
      name: "Salary",
      version: 0,
    },
  ]);
  await db.insert(payees).values([
    { id: seeded.grocerId, householdId, name: "Grocer", version: 0 },
    { id: seeded.employerId, householdId, name: "Employer", version: 0 },
  ]);
  await db
    .insert(tags)
    .values({ id: seeded.trainTagId, householdId, name: "Train", version: 0 });
  return seeded;
}

export type SeededHousehold = Awaited<ReturnType<typeof seedTestHousehold>>;
