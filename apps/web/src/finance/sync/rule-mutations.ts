import type { z } from "zod";
import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import { ruleRepository } from "../db/repositories/rule-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import { SCHEDULE_FIELDS } from "../domain/rules/schedule-fields.ts";
import {
  isUsable,
  occurrenceEntryId,
  withActiveMember,
} from "../rules/materialise-rules.ts";
import { nextOccurrence } from "../rules/next-occurrence.ts";
import { rescheduleExpected } from "../rules/reschedule-expected.ts";
import {
  retemplateExpected,
  templatePatch,
} from "../rules/retemplate-expected.ts";
import {
  ruleTemplateSchema,
  type RuleTemplate,
} from "../rules/rule-template-schema.ts";
import { sameTemplate } from "../rules/same-template.ts";
import { MutationError } from "./mutation-error.ts";
import {
  ruleFieldsSchema,
  type upsertRuleArgsSchema,
} from "./mutation-schema.ts";
import { parseNewRow } from "./parse-new-row.ts";
import { transactionMutations } from "./transaction-mutations.ts";
import type { WriteContext } from "./types.ts";
import { validateTransaction } from "./validate-transaction.ts";

type RuleRow = Awaited<
  ReturnType<typeof transactionRepository.findOfRuleFrom>
>[number];

/**
 * Makes the Rule's Expected Transactions from today on follow its template,
 * except the ones a bank row is matched to. A `restored` one takes the whole
 * template, as Materialise would make it, unless the template names a row
 * that a Transaction cannot use. A `kept` one takes what changed from
 * `before` to `after`; see `retemplateExpected`.
 */
async function rewriteExpected(
  context: WriteContext,
  ruleId: string,
  templates: { before: RuleTemplate | null; after: RuleTemplate },
  rows: { kept: RuleRow[]; restored: RuleRow[] },
) {
  const { scope } = context;
  const ids = [...rows.kept, ...rows.restored].map((row) => row.id);
  if (ids.length === 0) return;
  const [linked, entriesOf, tagIdsOf, before, after] = await Promise.all([
    bankTransactionRepository.findLinkedTransactionIds(scope, ids),
    transactionRepository.findEntriesOf(scope, ids),
    transactionRepository.findTagIdsOf(scope, ids),
    templates.before && withActiveMember(scope, templates.before),
    withActiveMember(scope, templates.after),
  ]);
  const detailed = (list: RuleRow[]) =>
    list
      .filter((row) => !linked.has(row.id))
      .map((row) => ({
        ...row,
        entries: entriesOf.get(row.id) ?? [],
        tagIds: tagIdsOf.get(row.id) ?? [],
      }));
  const newEntryId = (row: { date: string }, position: number) =>
    occurrenceEntryId(ruleId, row.date, position);

  if (rows.restored.length > 0 && (await isUsable(context, after))) {
    for (const row of detailed(rows.restored)) {
      await transactionMutations.update(
        context,
        row.id,
        templatePatch(after, row, newEntryId),
      );
    }
  }
  if (before === null) return;
  for (const { id, patch } of retemplateExpected(
    before,
    after,
    detailed(rows.kept),
    newEntryId,
  )) {
    await transactionMutations.update(context, id, patch);
  }
}

/**
 * Creates or changes a Rule. When its schedule changes or it is resumed, the
 * next occurrence is worked out again from today, so no missed occurrence
 * comes back, and a schedule change makes the Expected Transactions from
 * today on match the new schedule. A template change makes the Expected
 * Transactions from today on take the new accounts, amount, Payee, Category
 * and other fields; confirmed and bank-linked ones stay as they are. A Rule
 * keeps its kind. Deleting a Rule deletes its Expected Transactions too.
 */
async function upsertRule(
  context: WriteContext,
  args: z.infer<typeof upsertRuleArgsSchema>,
) {
  const { scope, today } = context;
  const { id, deleted, paused, ...fields } = args;
  if (fields.template) await validateTransaction(scope, fields.template);

  const existing = await ruleRepository.findById(scope, id);
  if (!existing) {
    const row = parseNewRow(
      ruleFieldsSchema
        .omit({ paused: true })
        .partial()
        .required({ name: true, unit: true, startsOn: true, template: true }),
      fields,
    );
    const schedule = {
      interval: 1,
      dayOfMonth: null,
      weekday: null,
      monthOfYear: null,
      nonBusinessDay: "stay" as const,
      endsOn: null,
      ...row,
    };
    const inserted = await ruleRepository.insert(scope, {
      ...row,
      id,
      nextOn: row.nextOn ?? nextOccurrence(schedule, schedule.startsOn),
    });
    if (!inserted) throw new MutationError("forbidden");
    if (paused) await ruleRepository.patch(scope, id, { paused });
    return;
  }
  if (existing.deletedAt && deleted !== false) {
    throw new MutationError("deleted");
  }
  const parsed = ruleTemplateSchema.safeParse(existing.template);
  const before = parsed.success ? parsed.data : null;
  if (fields.template && before && fields.template.kind !== before.kind) {
    throw new MutationError("invalid", "A rule keeps its kind");
  }

  const merged = { ...existing, ...fields };
  const scheduleChanged = SCHEDULE_FIELDS.some(
    (field) => fields[field] !== undefined && fields[field] !== existing[field],
  );
  const templateChanged =
    fields.template !== undefined &&
    before !== null &&
    !sameTemplate(before, fields.template);
  const resumed = paused === false && existing.pausedAt !== null;
  const nextOn =
    fields.nextOn ??
    (scheduleChanged || resumed ? nextOccurrence(merged, today) : undefined);
  await ruleRepository.patch(scope, id, { ...fields, nextOn, paused, deleted });
  if (deleted) {
    await transactionRepository.softDeleteExpectedOfRule(scope, id);
    return;
  }
  if (!scheduleChanged && !templateChanged) return;
  const rows = await transactionRepository.findOfRuleFrom(scope, id, today);
  const { remove, restore } = scheduleChanged
    ? rescheduleExpected(existing, merged, rows)
    : { remove: [], restore: [] };
  for (const transaction of remove) {
    await transactionRepository.softDelete(scope, transaction.id);
  }
  for (const transaction of restore) {
    await transactionRepository.restore(scope, transaction.id);
  }
  const removed = new Set(remove.map((row) => row.id));
  const kept = templateChanged
    ? rows.filter(
        (row) =>
          row.deletedAt === null &&
          row.status === "expected" &&
          !removed.has(row.id),
      )
    : [];
  const after = fields.template ?? before;
  if (after) {
    await rewriteExpected(
      context,
      id,
      { before, after },
      { kept, restored: restore },
    );
  }
}

export const ruleMutations = { upsertRule };
