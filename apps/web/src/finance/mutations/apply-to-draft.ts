import type { Mutation } from "../sync/mutation-schema.ts";
import { accountMutations } from "./account-mutations.ts";
import { ruleMutations } from "./rule-mutations.ts";
import { taxonomyMutations } from "./taxonomy-mutations.ts";
import { transactionMutations } from "./transaction-mutations.ts";
import type { MutationContext, MutationDraft, MutationScope } from "./types.ts";

/** A mutation without the id that the Outbox and the idempotency check use. */
export type MutationCall = Mutation extends infer Each
  ? Each extends Mutation
    ? Omit<Each, "id">
    : never
  : never;

function applyTo(scope: MutationScope, mutation: MutationCall) {
  switch (mutation.name) {
    case "createTransaction": {
      transactionMutations.createTransaction(scope, mutation.args);
      return;
    }
    case "updateTransaction": {
      transactionMutations.updateTransaction(
        scope,
        mutation.args.id,
        mutation.args.patch,
      );
      return;
    }
    case "deleteTransaction": {
      transactionMutations.deleteTransaction(scope, mutation.args.id);
      return;
    }
    case "restoreTransaction": {
      transactionMutations.restoreTransaction(scope, mutation.args.id);
      return;
    }
    case "confirmExpected": {
      transactionMutations.confirmExpected(
        scope,
        mutation.args.id,
        mutation.args.patch,
      );
      return;
    }
    case "skipExpected": {
      transactionMutations.skipExpected(scope, mutation.args.id);
      return;
    }
    case "putValuation": {
      accountMutations.putValuation(scope, mutation.args);
      return;
    }
    case "deleteValuation": {
      accountMutations.deleteValuation(scope, mutation.args.id);
      return;
    }
    case "upsertAccount": {
      accountMutations.upsertAccount(scope, mutation.args);
      return;
    }
    case "upsertGroup": {
      accountMutations.upsertGroup(scope, mutation.args);
      return;
    }
    case "upsertCategory": {
      taxonomyMutations.upsertCategory(scope, mutation.args);
      return;
    }
    case "upsertPayee": {
      taxonomyMutations.upsertPayee(scope, mutation.args);
      return;
    }
    case "mergePayee": {
      taxonomyMutations.mergePayee(scope, mutation.args);
      return;
    }
    case "upsertTag": {
      taxonomyMutations.upsertTag(scope, mutation.args);
      return;
    }
    case "upsertMember": {
      taxonomyMutations.upsertMember(scope, mutation.args);
      return;
    }
    case "upsertRule": {
      ruleMutations.upsertRule(scope, mutation.args);
      return;
    }
  }
}

/**
 * Applies one mutation to the draft, the same on the Replica and on the
 * server. Throws `MutationError` when the mutation breaks a rule, and
 * `WaitForServer` when the draft lacks the rows to decide; the draft may then
 * hold part of the change, so the caller discards it. Returns the accounts
 * whose balances change, with the first day that changes.
 */
export function applyToDraft(
  draft: MutationDraft,
  mutation: MutationCall,
  context: MutationContext,
): Map<string, string> {
  const scope: MutationScope = { draft, context, touched: new Map() };
  applyTo(scope, mutation);
  return scope.touched;
}
