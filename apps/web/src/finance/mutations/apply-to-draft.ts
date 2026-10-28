import type { Mutation } from "../sync/mutation-schema.ts";
import { bindMutation } from "./bind-mutation.ts";
import type { MutationContext, MutationDraft, MutationScope } from "./types.ts";

/** A mutation without the id that the Outbox and the idempotency check use. */
export type MutationCall = Mutation extends infer Each
  ? Each extends Mutation
    ? Omit<Each, "id">
    : never
  : never;

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
  bindMutation(mutation).apply(scope);
  return scope.touched;
}
