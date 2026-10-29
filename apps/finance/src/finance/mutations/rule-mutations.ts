import { SCHEDULE_FIELDS } from "../domain/rules/schedule-fields.ts";
import { mayAutoPost } from "../reconciliation/may-auto-post.ts";
import { nextOccurrence } from "../rules/next-occurrence.ts";
import {
  ruleTemplateSchema,
  type RuleTemplate,
} from "../rules/rule-template-schema.ts";
import { sameTemplate } from "../rules/same-template.ts";
import { MutationError } from "../sync/mutation-error.ts";
import {
  ruleFieldsSchema,
  upsertRuleArgsSchema,
} from "../sync/mutation-schema.ts";
import { parseNewRow } from "../sync/parse-new-row.ts";
import type { RuleRow } from "../sync/row-schemas.ts";
import { invalid } from "./invalid.ts";
import { previousUpsertArgs } from "./previous-upsert-args.ts";
import { read } from "./read.ts";
import { stampAfter } from "./stamp-after.ts";
import {
  checkTransactionRows,
  namedRowReads,
  softDeleteTransaction,
} from "./transaction-mutations.ts";
import type {
  MutationArgs,
  MutationDraft,
  MutationScope,
  MutationSpecs,
} from "./types.ts";

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

function storedTemplateOf(rule: RuleRow): RuleTemplate | null {
  const parsed = ruleTemplateSchema.safeParse(rule.template);
  return parsed.success ? parsed.data : null;
}

export function ruleChangeOf(
  existing: RuleRow,
  fields: RuleFields,
  paused: boolean | undefined,
  today: string,
): RuleChange {
  const before = storedTemplateOf(existing);
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
 * The template Entries whose accounts decide if a Rule may post
 * automatically after an upsert: none when it then does not post
 * automatically.
 */
function autoPostEntriesOf(
  existing: RuleRow | undefined,
  args: Pick<UpsertRuleArgs, "autoPost" | "template">,
): RuleTemplate["entries"] {
  if (!(args.autoPost ?? existing?.autoPost)) return [];
  const template =
    args.template ?? (existing ? storedTemplateOf(existing) : null);
  return template?.entries ?? [];
}

function autoPostAfter(
  draft: MutationDraft,
  existing: RuleRow | undefined,
  args: UpsertRuleArgs,
  autoPost: boolean,
) {
  return (
    autoPost &&
    mayAutoPost(autoPostEntriesOf(existing, args), (accountId) =>
      draft.hasLive("bankLinks", { accountId }),
    )
  );
}

/**
 * Creates or changes a Rule. When its schedule changes or it is resumed, the
 * next occurrence is worked out again from today, so no missed occurrence
 * comes back. A Rule keeps its kind. A Rule on an account with a Bank link
 * does not post automatically, even when the upsert asks for it, so that a
 * Replica that does not know of the link yet loses no other change. Deleting
 * a Rule deletes its Expected Transactions too. What a schedule or template
 * change does to the Expected Transactions is for the server to work out;
 * see `rewriteExpected`.
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
      autoPost: autoPostAfter(draft, undefined, args, schedule.autoPost),
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
    autoPost: autoPostAfter(draft, existing, args, merged.autoPost),
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
  upsertRule: {
    reads: [
      ({ id, template, deleted }) => [
        read.get("rules", [id]),
        ...(template ? namedRowReads(template) : []),
        deleted
          ? read.where("transactions", { ruleId: id, status: "expected" })
          : undefined,
      ],
      (args, draft) => {
        const accountIds = new Set(
          autoPostEntriesOf(draft.get("rules", args.id), args).map(
            (entry) => entry.accountId,
          ),
        );
        const expected = args.deleted
          ? draft.where("transactions", { ruleId: args.id, status: "expected" })
          : [];
        return [
          ...[...accountIds].map((accountId) =>
            read.hasLive("bankLinks", { accountId }),
          ),
          ...expected.map((transaction) =>
            read.where("entries", { transactionId: transaction.id }),
          ),
        ];
      },
    ],
    apply: upsertRule,
    inverse: (snapshot, args) => [
      {
        name: "upsertRule",
        args: previousUpsertArgs(
          snapshot.tables.rules.get(args.id),
          args,
          upsertRuleArgsSchema,
        ),
      },
    ],
  },
} satisfies Partial<MutationSpecs>;
