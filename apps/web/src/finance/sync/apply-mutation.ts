import { householdRepository } from "../db/repositories/household-repository.ts";
import {
  applyToDraft,
  type MutationCall,
} from "../mutations/apply-to-draft.ts";
import { ruleChangeOf } from "../mutations/rule-mutations.ts";
import type { MutationArgs, Provenance } from "../mutations/types.ts";
import { ruleOccurrences } from "../rules/rule-occurrences.ts";
import { createStrictDraft, type StrictDraft } from "./create-strict-draft.ts";
import { loadMutationRows } from "./load-mutation-rows.ts";
import type { AccountRow } from "./row-schemas.ts";
import type { PushEffect, WriteContext } from "./types.ts";
import { writeDraftRows } from "./write-draft-rows.ts";

const INSTITUTION_INPUTS = [
  "institution",
  "institutionDomain",
  "currency",
] as const;

/** True when the account is new, restored, or has a new currency. */
function startsToCountIn(
  existing: AccountRow | undefined,
  currency: string,
  deleted: boolean | undefined,
) {
  const live = existing?.deletedAt ? deleted === false : !deleted;
  const counted = Boolean(existing && !existing.deletedAt);
  return live && !(counted && existing?.currency === currency);
}

/** What an account change means for the work after the push. */
function accountEffects(
  strict: StrictDraft,
  args: MutationArgs<"upsertAccount">,
  baseCurrency: string | undefined,
) {
  const change = strict.changes("accounts").at(0);
  const existing = change?.before;
  const effects: PushEffect[] = [];
  const changesInstitution = existing
    ? INSTITUTION_INPUTS.some(
        (key) => args[key] !== undefined && args[key] !== existing[key],
      )
    : Boolean(args.institution) || Boolean(args.institutionDomain);
  if (changesInstitution) effects.push("institution-changed");
  const currency = args.currency ?? existing?.currency;
  if (
    currency !== undefined &&
    startsToCountIn(existing, currency, args.deleted) &&
    currency !== baseCurrency
  ) {
    effects.push("currency-changed");
  }
  return effects;
}

/** The Rule's Expected Transactions follow a schedule or template change. */
async function followRuleChange(
  context: WriteContext,
  strict: StrictDraft,
  args: MutationArgs<"upsertRule">,
) {
  const change = strict.changes("rules").at(0);
  if (!change?.before || args.deleted) return;
  const { id: _id, deleted: _deleted, paused, ...fields } = args;
  const { before, merged, scheduleChanged, templateChanged } = ruleChangeOf(
    change.before,
    fields,
    paused,
    context.today,
  );
  if (!scheduleChanged && !templateChanged) return;
  await ruleOccurrences.rewriteExpected(context, {
    ruleId: args.id,
    schedules: scheduleChanged
      ? { before: change.before, after: merged }
      : null,
    template: fields.template ?? before,
    previousTemplate: templateChanged ? before : null,
  });
}

/**
 * Applies one checked mutation inside an open write: loads the rows it
 * needs, runs it as the Replica does, and writes the rows it changed. Then
 * does what only the server does: an account change reports its effects,
 * and a Rule change rewrites the Rule's Expected Transactions. Throws
 * `MutationError` to reject the mutation.
 */
export async function applyMutation(
  context: WriteContext,
  mutation: MutationCall,
  options: { provenance?: Provenance } = {},
): Promise<PushEffect[]> {
  const { scope } = context;
  const strict = createStrictDraft();
  await loadMutationRows(scope, strict, mutation);
  const now = await householdRepository.transactionTime(scope);
  const baseCurrency =
    mutation.name === "upsertAccount"
      ? (await householdRepository.find(scope))?.baseCurrency
      : undefined;
  const touched = applyToDraft(strict.draft, mutation, {
    householdId: scope.householdId,
    now,
    today: context.today,
    actor: context.actor,
    baseCurrency,
    provenance: options.provenance,
  });
  await writeDraftRows(scope, strict);
  for (const [accountId, day] of touched) {
    context.touches.account(accountId, day);
  }
  if (mutation.name === "upsertAccount") {
    return accountEffects(strict, mutation.args, baseCurrency);
  }
  if (mutation.name === "upsertRule") {
    await followRuleChange(context, strict, mutation.args);
  }
  return [];
}
