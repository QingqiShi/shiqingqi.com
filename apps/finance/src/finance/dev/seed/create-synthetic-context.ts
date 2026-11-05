import { addDays, daysBetween } from "../../domain/dates/add-days.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import { createPrng } from "./create-prng.ts";
import {
  SYNTHETIC_ACCOUNTS,
  type SyntheticAccount,
  type SyntheticOwner,
} from "./synthetic-accounts.ts";
import { SYNTHETIC_PAYEES } from "./synthetic-payees.ts";

export function minorOf(pounds: number) {
  return Math.round(pounds * 100);
}

export function createSyntheticContext({
  seed,
  today,
  version,
}: {
  seed: number;
  today: string;
  version: number;
}) {
  const prng = createPrng(seed);
  const id = (...parts: (string | number)[]) =>
    nameBasedUuid(["synthetic", seed, ...parts].join(":"));
  const householdId = id("household");
  const memberIds = { alex: id("member", "alex"), sam: id("member", "sam") };
  const memberOf = (owner: SyntheticOwner) =>
    owner === null ? null : memberIds[owner];
  const randomMember = () => memberIds[prng.pick(["alex", "sam"] as const)];

  const stamp = (day: string) => {
    const date = day < today ? day : today;
    const hour = String(prng.int(7, 22)).padStart(2, "0");
    const minute = String(prng.int(0, 59)).padStart(2, "0");
    return new Date(`${date}T${hour}:${minute}:00.000Z`);
  };
  const randomDay = (from: string, to: string) =>
    addDays(from, prng.int(0, Math.max(0, daysBetween(from, to))));

  const groupId = (key: string) => id("group", key);
  const categoryId = (key: string) => id("category", key);
  const uncategorised = {
    expense: id("category", "uncategorised", "expense"),
    income: id("category", "uncategorised", "income"),
  };
  const tagId = (name: string) => id("tag", name);
  const payeeByName = new Map(SYNTHETIC_PAYEES.map((p) => [p.name, p]));
  const payeeId = (name: string) => id("payee", name);
  const accountId = (key: string) => id("account", key);
  const accountByKey = new Map(SYNTHETIC_ACCOUNTS.map((a) => [a.key, a]));
  const accountSpec = (key: string): SyntheticAccount => {
    const spec = accountByKey.get(key);
    if (!spec) throw new Error(`Unknown synthetic account ${key}`);
    return spec;
  };

  return {
    prng,
    id,
    today,
    version,
    householdId,
    memberIds,
    memberOf,
    randomMember,
    stamp,
    randomDay,
    groupId,
    categoryId,
    uncategorised,
    tagId,
    payeeByName,
    payeeId,
    accountId,
    accountSpec,
  };
}

export type SyntheticContext = ReturnType<typeof createSyntheticContext>;
