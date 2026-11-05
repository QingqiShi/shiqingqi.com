import type { rules } from "../../db/schema.ts";
import { addDays, daysBetween } from "../../domain/dates/add-days.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import {
  nextOccurrence,
  occurrencesBetween,
  type RuleSchedule,
} from "../../rules/next-occurrence.ts";
import { occurrenceId } from "../../rules/occurrence-id.ts";
import type { RuleTemplate } from "../../rules/rule-template-schema.ts";
import { minorOf, type SyntheticContext } from "./create-synthetic-context.ts";
import type { SyntheticLedger } from "./create-synthetic-ledger.ts";
import { SYNTHETIC_RULES, type SyntheticRule } from "./synthetic-rules.ts";

const EXPECTED_WINDOW_DAYS = 7;

export function addSyntheticRules(
  {
    prng,
    id,
    today,
    version,
    householdId,
    memberOf,
    categoryId,
    payeeId,
    accountId,
  }: SyntheticContext,
  { add }: SyntheticLedger,
  { start, openedAt }: { start: string; openedAt: Date },
) {
  // rules and their occurrences

  const ruleRows: (typeof rules.$inferInsert)[] = [];
  const occurrenceDays = new Map<string, string[]>();
  const expectedHorizon = addDays(today, EXPECTED_WINDOW_DAYS);
  for (const spec of SYNTHETIC_RULES) {
    const ruleId = id("rule", spec.key);
    const base: RuleSchedule = {
      unit: "month",
      interval: 1,
      dayOfMonth: spec.dayOfMonth,
      weekday: null,
      monthOfYear: null,
      nonBusinessDay: "stay",
      startsOn: start,
      endsOn: null,
    };
    const schedule = {
      ...base,
      startsOn: nextOccurrence(base, start),
    };
    const amountMinor = minorOf(spec.amount);
    const template: RuleTemplate = {
      kind: spec.kind,
      categoryId: spec.category ? categoryId(spec.category) : null,
      payeeId: spec.payee ? payeeId(spec.payee) : null,
      memberId: memberOf(spec.member),
      note: "",
      entries: ruleEntries(spec, amountMinor).map((entry) => ({
        accountId: accountId(entry.account),
        amountMinor: entry.amountMinor,
      })),
      tagIds: [],
    };
    const days = occurrencesBetween(
      schedule,
      schedule.startsOn,
      expectedHorizon,
    );
    occurrenceDays.set(
      spec.key,
      days.filter((day) => day <= today),
    );
    ruleRows.push({
      id: ruleId,
      householdId,
      name: spec.name,
      unit: "month",
      interval: 1,
      dayOfMonth: spec.dayOfMonth,
      startsOn: schedule.startsOn,
      nextOn: nextOccurrence(schedule, addDays(expectedHorizon, 1)),
      autoPost: spec.autoPost,
      template,
      version,
      createdAt: openedAt,
      updatedAt: openedAt,
    });

    for (const day of days) {
      const overdue =
        !spec.autoPost && day <= today && daysBetween(day, today) < 3;
      const status = day > today || overdue ? "expected" : "posted";
      const factor =
        spec.varies && day <= today
          ? 1 + spec.varies * (prng.next() * 2 - 1)
          : 1;
      const occurrenceAmount = Math.round(amountMinor * factor);
      const entries = ruleEntries(spec, occurrenceAmount);
      add({
        id: occurrenceId(ruleId, day),
        kind: spec.kind,
        status,
        date: day,
        categoryId: spec.category ? categoryId(spec.category) : null,
        payeeId: spec.payee ? payeeId(spec.payee) : null,
        memberId: memberOf(spec.member),
        ruleId,
        source: "rule",
        entries: entries.map((entry, index) => ({
          ...entry,
          id: nameBasedUuid(`rule:${ruleId}:${day}:${String(index)}`),
        })),
      });
    }
  }

  return { ruleRows, occurrenceDays };
}

function ruleEntries(spec: SyntheticRule, amountMinor: number) {
  if (spec.kind === "income") {
    return [{ account: spec.account, amountMinor }];
  }
  if (spec.kind === "expense") {
    return [{ account: spec.account, amountMinor: -amountMinor }];
  }
  const to = spec.toAccount;
  if (!to) throw new Error(`Rule ${spec.key} is a transfer without a target`);
  return [
    { account: spec.account, amountMinor: -amountMinor },
    { account: to, amountMinor },
  ];
}
