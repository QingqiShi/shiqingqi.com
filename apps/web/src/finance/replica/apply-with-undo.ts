import type { Mutation } from "../sync/mutation-schema.ts";
import type {
  LocalMutationInput,
  ReplicaStore,
} from "./create-replica-store.ts";
import { inverseMutations } from "./inverse-mutations.ts";

interface UndoableResult {
  mutations: Mutation[];
  /** The mutations that undo the batch, in order; null when one of them cannot be undone. */
  undo: LocalMutationInput[] | null;
}

/**
 * Applies `inputs` to the Replica in order and returns the mutations that
 * undo all of them. When one is refused, it undoes the ones before it and
 * throws the error, so a batch is all or nothing.
 */
export function applyWithUndo(
  store: Pick<ReplicaStore, "applyLocal" | "getSnapshot">,
  inputs: readonly LocalMutationInput[],
  createId: () => string = () => crypto.randomUUID(),
): UndoableResult {
  const mutations: Mutation[] = [];
  const undo: LocalMutationInput[] = [];
  let undoable = true;
  try {
    for (const input of inputs) {
      const before = store.getSnapshot();
      const mutation = store.applyLocal(input);
      mutations.push(mutation);
      const inverse = inverseMutations(before, mutation, createId);
      if (inverse) undo.unshift(...inverse);
      else undoable = false;
    }
  } catch (error) {
    if (undoable) {
      for (const input of undo) store.applyLocal(input);
    }
    throw error;
  }
  return { mutations, undo: undoable ? undo : null };
}
