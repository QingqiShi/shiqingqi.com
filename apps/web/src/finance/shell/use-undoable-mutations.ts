import { t } from "#src/i18n.ts";
import { applyWithUndo } from "../replica/apply-with-undo.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import type { Mutation } from "../sync/mutation-schema.ts";
import { useToast } from "./toast-provider.tsx";

export interface UndoableToast {
  /** What happened, such as "4 balances updated". */
  message: string;
  /** Called after Undo has put the Replica back. */
  onUndone?: () => void;
}

/**
 * Applies a batch of mutations to the Replica and shows a toast with Undo
 * for the whole batch. A refused mutation undoes the ones before it and
 * throws, like `applyLocal`.
 */
export function useUndoableMutations() {
  const store = useReplicaStore();
  const showToast = useToast();
  const undoLabel = t({ en: "Undo", zh: "撤销" });
  const undoFailed = t({
    en: "Couldn't undo. The data changed in the meantime.",
    zh: "无法撤销，数据已在此期间被更改。",
  });

  return (
    inputs: readonly LocalMutationInput[],
    { message, onUndone }: UndoableToast,
  ): Mutation[] => {
    const { mutations, undo } = applyWithUndo(store, inputs);
    showToast({
      message,
      action:
        undo && undo.length > 0
          ? {
              label: undoLabel,
              onAction: () => {
                try {
                  applyWithUndo(store, undo);
                  onUndone?.();
                } catch {
                  showToast({ message: undoFailed });
                }
              },
            }
          : undefined,
    });
    return mutations;
  };
}
