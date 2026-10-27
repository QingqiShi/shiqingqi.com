import {
  MATCH_DAY_WINDOW,
  planBankMatches,
} from "../bank/plan-bank-matches.ts";
import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { sameSet } from "../domain/same-set.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { checkTransactionRows } from "../mutations/transaction-mutations.ts";
import { applyMutation } from "../sync/apply-mutation.ts";
import { createStrictDraft } from "../sync/create-strict-draft.ts";
import { loadNamedRows } from "../sync/load-mutation-rows.ts";
import { MutationError } from "../sync/mutation-error.ts";
import type { TransactionPatch } from "../sync/mutation-schema.ts";
import type { WriteContext } from "../sync/types.ts";
import { nextOccurrence, type RuleSchedule } from "./next-occurrence.ts";
import type { RuleTemplate } from "./rule-template-schema.ts";
import { sameEntries } from "./same-template.ts";

/** The id of a Rule's Transaction on a day; the same occurrence always gets the same id. */
export function occurrenceId(ruleId: string, day: string) {
  return nameBasedUuid(`rule:${ruleId}:${day}`);
}

/** The id of the Entry at `position` of a Rule's Transaction on a day. */
export function occurrenceEntryId(
  ruleId: string,
  day: string,
  position: number,
) {
  return nameBasedUuid(`rule:${ruleId}:${day}:${String(position)}`);
}

/**
 * The fields, Entries and Tags of a Rule's Transaction made from `template`.
 * `entryId` names the Entry at each position.
 */
export function occurrenceFromTemplate(
  template: RuleTemplate,
  entryId: (position: number) => string,
) {
  return {
    kind: template.kind,
    categoryId: template.categoryId,
    payeeId: template.payeeId,
    memberId: template.memberId,
    note: template.note,
    entries: template.entries.map((entry, position) => ({
      id: entryId(position),
      accountId: entry.accountId,
      amountMinor: entry.amountMinor,
    })),
    tagIds: [...new Set(template.tagIds)],
  };
}

/** The template with its Member only while that Member is active, as each Transaction of the Rule takes it. */
export async function withActiveMember(
  scope: RepositoryScope,
  template: RuleTemplate,
): Promise<RuleTemplate> {
  return {
    ...template,
    memberId: await memberRepository.activeIdOrNull(scope, template.memberId),
  };
}

/** False when the template names a row that a Transaction cannot use, such as a deleted account. */
async function isUsable(scope: RepositoryScope, template: RuleTemplate) {
  const strict = createStrictDraft();
  await loadNamedRows({ scope, strict }, template);
  try {
    checkTransactionRows(strict.draft, template);
    return true;
  } catch (error) {
    if (error instanceof MutationError) return false;
    throw error;
  }
}

/**
 * What holds a day of a Rule: a Transaction of the Rule, or a bank-backed
 * one it may take. A Transaction the Rule made
 * holds the day its id names, so one that Bank sync moved to the bank row's
 * date still holds its first day. Another Transaction of the Rule, for
 * example an imported one, holds its date. A bank-backed Transaction with
 * no Rule holds a day within `MATCH_DAY_WINDOW` of its date, paired as Bank
 * sync pairs bank rows with Expected Transactions, and so does one the Rule
 * took that way before.
 */
export type OccurrenceHolder =
  | { kind: "rule"; transactionId: string }
  | { kind: "bank"; transactionId: string; ruleId: string | null };

/**
 * The Transaction of the Rule, live or deleted, that holds each of `days`.
 * A deleted one holds its day too, so a skipped occurrence stays skipped.
 */
async function ruleHolders(
  scope: RepositoryScope,
  ruleId: string,
  days: readonly string[],
) {
  const dayById = new Map(days.map((day) => [occurrenceId(ruleId, day), day]));
  const rows = await transactionRepository.findOfRuleOnDaysOrIds(
    scope,
    ruleId,
    [...days],
    [...dayById.keys()],
  );
  const holders = new Map<string, OccurrenceHolder>();
  for (const row of rows) {
    const day = dayById.get(row.id) ?? row.date;
    if (!holders.has(day)) {
      holders.set(day, { kind: "rule", transactionId: row.id });
    }
  }
  return { holders, ids: new Set(rows.map((row) => row.id)) };
}

/** The bank-backed Transaction that holds each of `days`, none of them in `taken`. */
async function bankHolders(
  scope: RepositoryScope,
  ruleId: string,
  template: RuleTemplate,
  days: readonly string[],
  taken: ReadonlySet<string>,
) {
  const holders = new Map<string, OccurrenceHolder>();
  if (days.length === 0) return holders;
  const candidates = (
    await bankTransactionRepository.findBankBacked(scope, template.entries, {
      from: addDays(days[0], -MATCH_DAY_WINDOW),
      to: addDays(days[days.length - 1], MATCH_DAY_WINDOW),
    })
  ).filter(
    (candidate) =>
      !taken.has(candidate.transactionId) &&
      (candidate.ruleId === null ||
        (candidate.ruleId === ruleId && candidate.source !== "rule")),
  );
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.transactionId, candidate]),
  );
  // Each candidate has an amount of the template already. Thus all days and
  // candidates get the same amount, and the plan pairs them by date only.
  const plan = planBankMatches(
    days.map((date) => ({ date, amountMinor: 0 })),
    candidates.map((candidate) => ({
      ...candidate,
      amountMinor: 0,
      inTransit: false,
    })),
  );
  for (const [index, day] of days.entries()) {
    const match = plan[index];
    if (match.action === "create") continue;
    const candidate = candidateById.get(match.transactionId);
    if (candidate) {
      holders.set(day, {
        kind: "bank",
        transactionId: candidate.transactionId,
        ruleId: candidate.ruleId,
      });
    }
  }
  return holders;
}

/** What holds each of `days`, in date order, of the Rule; a day without a holder is free. */
async function findOccurrenceHolders(
  scope: RepositoryScope,
  rule: { id: string; template: RuleTemplate },
  days: readonly string[],
): Promise<Map<string, OccurrenceHolder>> {
  const byRule = await ruleHolders(scope, rule.id, days);
  const byBank = await bankHolders(
    scope,
    rule.id,
    rule.template,
    days.filter((day) => !byRule.holders.has(day)),
    byRule.ids,
  );
  return new Map([...byRule.holders, ...byBank]);
}

interface RuleTransaction {
  id: string;
  date: string;
  status: "posted" | "expected";
  deletedAt: unknown;
}

function isOccurrence(schedule: RuleSchedule, day: string) {
  return nextOccurrence(schedule, day) === day;
}

/**
 * What a schedule change does to a Rule's Transactions from today on, so
 * that its Expected ones match the new schedule and Materialise adds no
 * second one next to them. A live Expected one off the new schedule is
 * deleted. A deleted Expected one on the new schedule but not the old one is
 * restored, because an earlier schedule change deleted it, unless a live
 * Transaction of the Rule already has its day. A skipped one is on the old
 * schedule, so it stays skipped.
 */
function rescheduleExpected<Row extends RuleTransaction>(
  before: RuleSchedule,
  after: RuleSchedule,
  rows: readonly Row[],
) {
  const remove: Row[] = [];
  const restore: Row[] = [];
  const liveDays = new Set<string>();
  for (const row of rows) {
    if (row.deletedAt !== null) continue;
    if (row.status === "expected" && !isOccurrence(after, row.date)) {
      remove.push(row);
    } else {
      liveDays.add(row.date);
    }
  }
  const deleted = rows
    .filter((row) => row.deletedAt !== null && row.status === "expected")
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const row of deleted) {
    if (
      !liveDays.has(row.date) &&
      isOccurrence(after, row.date) &&
      !isOccurrence(before, row.date)
    ) {
      restore.push(row);
      liveDays.add(row.date);
    }
  }
  return { remove, restore };
}

interface DetailedTransaction {
  id: string;
  date: string;
  kind: RuleTemplate["kind"];
  categoryId: string | null;
  payeeId: string | null;
  memberId: string | null;
  note: string;
  /** The live Entries, in order. */
  entries: readonly { id: string; accountId: string; amountMinor: number }[];
  tagIds: readonly string[];
}

const LABEL_FIELDS = ["categoryId", "payeeId", "memberId", "note"] as const;

/** Every field of `template` as a patch for `row`; the Entry at each position keeps its id. */
function templatePatch(
  ruleId: string,
  template: RuleTemplate,
  row: DetailedTransaction,
) {
  return occurrenceFromTemplate(
    template,
    (position) =>
      row.entries.at(position)?.id ??
      occurrenceEntryId(ruleId, row.date, position),
  );
}

/**
 * What a template change does to one Expected Transaction, so that it looks
 * as Materialise would make it from the new template. It takes the fields
 * that the change touched, so a field that a Member changed on it stays
 * when the template keeps it. One that a Member gave another kind stays as
 * it is.
 */
function retemplatePatch(
  ruleId: string,
  before: RuleTemplate,
  after: RuleTemplate,
  row: DetailedTransaction,
): TransactionPatch {
  const patch: TransactionPatch = {};
  if (row.kind !== after.kind) return patch;
  const target = templatePatch(ruleId, after, row);
  for (const field of LABEL_FIELDS) {
    if (before[field] !== after[field] && row[field] !== target[field]) {
      Object.assign(patch, { [field]: target[field] });
    }
  }
  if (
    !sameSet(before.tagIds, after.tagIds) &&
    !sameSet(row.tagIds, target.tagIds)
  ) {
    patch.tagIds = target.tagIds;
  }
  if (
    !sameEntries(before.entries, after.entries) &&
    !sameEntries(row.entries, target.entries)
  ) {
    patch.entries = target.entries;
  }
  return patch;
}

/** What changed on a Rule that its Expected Transactions from today on follow. */
interface RuleRewrite {
  ruleId: string;
  /** Set when the schedule changed. */
  schedules: { before: RuleSchedule; after: RuleSchedule } | null;
  /** The template the Rule has now; null when the stored one does not parse. */
  template: RuleTemplate | null;
  /** Set when the template changed: the template before the change. */
  previousTemplate: RuleTemplate | null;
}

/**
 * Makes the Rule's Expected Transactions from today on follow a schedule or
 * template change. A schedule change deletes and restores them as
 * `rescheduleExpected` says. Then each one that no bank row is matched to
 * takes the template: a restored one takes the whole template, as
 * Materialise would make it, unless the template names a row that a
 * Transaction cannot use; after a template change, a kept one takes what
 * changed.
 */
async function rewriteExpected(
  context: WriteContext,
  { ruleId, schedules, template, previousTemplate }: RuleRewrite,
) {
  const { scope, today } = context;
  const rows = await transactionRepository.findOfRuleFrom(scope, ruleId, today);
  const { remove, restore } = schedules
    ? rescheduleExpected(schedules.before, schedules.after, rows)
    : { remove: [], restore: [] };
  for (const row of remove) {
    await transactionRepository.softDelete(scope, row.id);
  }
  for (const row of restore) {
    await transactionRepository.restore(scope, row.id);
  }
  if (!template) return;
  const removed = new Set(remove.map((row) => row.id));
  const kept = previousTemplate
    ? rows.filter(
        (row) =>
          row.deletedAt === null &&
          row.status === "expected" &&
          !removed.has(row.id),
      )
    : [];
  const ids = [...restore, ...kept].map((row) => row.id);
  if (ids.length === 0) return;
  const [bankBacked, entriesOf, tagIdsOf, before, after] = await Promise.all([
    bankTransactionRepository.findLinkedTransactionIds(scope, ids),
    transactionRepository.findEntriesOf(scope, ids),
    transactionRepository.findTagIdsOf(scope, ids),
    previousTemplate && withActiveMember(scope, previousTemplate),
    withActiveMember(scope, template),
  ]);
  const detailed = (row: (typeof rows)[number]) => ({
    ...row,
    entries: entriesOf.get(row.id) ?? [],
    tagIds: tagIdsOf.get(row.id) ?? [],
  });
  const patches: { id: string; patch: TransactionPatch }[] = [];
  if (restore.length > 0 && (await isUsable(scope, after))) {
    for (const row of restore) {
      patches.push({
        id: row.id,
        patch: templatePatch(ruleId, after, detailed(row)),
      });
    }
  }
  if (before) {
    for (const row of kept) {
      patches.push({
        id: row.id,
        patch: retemplatePatch(ruleId, before, after, detailed(row)),
      });
    }
  }
  for (const { id, patch } of patches) {
    if (bankBacked.has(id) || Object.keys(patch).length === 0) continue;
    await applyMutation(context, {
      name: "updateTransaction",
      args: { id, patch },
    });
  }
}

export const ruleOccurrences = {
  isUsable,
  findOccurrenceHolders,
  rewriteExpected,
};
