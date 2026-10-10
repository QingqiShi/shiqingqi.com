import type { z } from "zod";
import { ruleRepository } from "../db/repositories/rule-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import { SCHEDULE_FIELDS } from "../domain/rules/schedule-fields.ts";
import { nextOccurrence } from "../rules/next-occurrence.ts";
import { MutationError } from "./mutation-error.ts";
import {
  ruleFieldsSchema,
  type upsertRuleArgsSchema,
} from "./mutation-schema.ts";
import { parseNewRow } from "./parse-new-row.ts";
import type { WriteContext } from "./types.ts";
import { validateTransaction } from "./validate-transaction.ts";

/**
 * Creates or changes a Rule. When its schedule changes or it is resumed, the
 * next occurrence is worked out again from today, so no missed occurrence
 * comes back. Deleting a Rule deletes its Expected Transactions too.
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

  const merged = { ...existing, ...fields };
  const scheduleChanged = SCHEDULE_FIELDS.some(
    (field) => fields[field] !== undefined && fields[field] !== existing[field],
  );
  const resumed = paused === false && existing.pausedAt !== null;
  const nextOn =
    fields.nextOn ??
    (scheduleChanged || resumed ? nextOccurrence(merged, today) : undefined);
  await ruleRepository.patch(scope, id, { ...fields, nextOn, paused, deleted });
  if (deleted) {
    await transactionRepository.softDeleteExpectedOfRule(scope, id);
  }
}

export const ruleMutations = { upsertRule };
