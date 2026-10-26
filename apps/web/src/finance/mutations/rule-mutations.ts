import { SCHEDULE_FIELDS } from "../domain/rules/schedule-fields.ts";
import { nextOccurrence } from "../rules/next-occurrence.ts";
import {
  ruleTemplateSchema,
  type RuleTemplate,
} from "../rules/rule-template-schema.ts";
import { sameTemplate } from "../rules/same-template.ts";
import { MutationError } from "../sync/mutation-error.ts";
import { ruleFieldsSchema } from "../sync/mutation-schema.ts";
import { parseNewRow } from "../sync/parse-new-row.ts";
import type { RuleRow } from "../sync/row-schemas.ts";
import { invalid } from "./invalid.ts";
import { stampAfter } from "./stamp-after.ts";
import {
  checkTransactionRows,
  softDeleteTransaction,
} from "./transaction-mutations.ts";
import type { MutationArgs, MutationScope } from "./types.ts";

type UpsertRuleArgs = MutationArgs<"upsertRule">;
type RuleFields = Omit<UpsertRuleArgs, "id" | "deleted" | "paused">;

/** What an upsert changes on a Rule that exists. */
export interface RuleChange {
  /** The stored template; null when it does not parse. */
  before: RuleTemplate | null;
  merged: RuleRow;
  scheduleChanged: boolean;
  templateChanged: boolean;
}

export function ruleChangeOf(
  existing: RuleRow,
  fields: RuleFields,
  paused: boolean | undefined,
  today: string,
): RuleChange {
  const parsed = ruleTemplateSchema.safeParse(existing.template);
  const before = parsed.success ? parsed.data : null;
  const scheduleChanged = SCHEDULE_FIELDS.some(
    (field) => fields[field] !== undefined && fields[field] !== existing[field],
  );
  const templateChanged =
    fields.template !== undefined &&
    before !== null &&
    !sameTemplate(before, fields.template);
  const resumed = paused === false && existing.pausedAt !== null;
  const merged = { ...existing, ...fields };
  const nextOn =
    fields.nextOn ??
    (scheduleChanged || resumed
      ? nextOccurrence(merged, today)
      : existing.nextOn);
  return {
    before,
    merged: { ...merged, nextOn },
    scheduleChanged,
    templateChanged,
  };
}

/**
 * Creates or changes a Rule. When its schedule changes or it is resumed, the
 * next occurrence is worked out again from today, so no missed occurrence
 * comes back. A Rule keeps its kind. Deleting a Rule deletes its Expected
 * Transactions too. What a schedule or template change does to the
 * Expected Transactions is for the server to work out; see
 * `rewriteExpected`.
 */
function upsertRule(scope: MutationScope, args: UpsertRuleArgs) {
  const { draft, context } = scope;
  const { id, deleted, paused, ...fields } = args;
  if (fields.template) checkTransactionRows(draft, fields.template);
  const pausedAt = (current: string | null) =>
    stampAfter(paused, current, context.now);

  const existing = draft.get("rules", id);
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
      autoPost: false,
      ...row,
    };
    draft.put("rules", id, {
      id,
      householdId: context.householdId,
      ...schedule,
      nextOn: row.nextOn ?? nextOccurrence(schedule, schedule.startsOn),
      pausedAt: pausedAt(null),
      version: 0,
      createdAt: context.now,
      updatedAt: context.now,
      deletedAt: null,
    });
    return;
  }
  if (existing.deletedAt && deleted !== false) {
    throw new MutationError("deleted");
  }
  const { before, merged } = ruleChangeOf(
    existing,
    fields,
    paused,
    context.today,
  );
  if (fields.template && before && fields.template.kind !== before.kind) {
    invalid("A rule keeps its kind");
  }
  draft.put("rules", id, {
    ...merged,
    pausedAt: pausedAt(existing.pausedAt),
    updatedAt: context.now,
    deletedAt: stampAfter(deleted, existing.deletedAt, scope.context.now),
  });
  if (!deleted) return;
  for (const transaction of draft.where("transactions", {
    ruleId: id,
    status: "expected",
  })) {
    if (transaction.deletedAt === null) {
      softDeleteTransaction(scope, transaction);
    }
  }
}

export const ruleMutations = {
  upsertRule,
};
