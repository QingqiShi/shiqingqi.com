import type { ToastAction } from "@tuja/ui/components/toast";
import { useToast } from "@tuja/ui/components/toast-provider";
import { t } from "#src/i18n.ts";
import { applyAll } from "../replica/apply-with-undo.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";

/** Shows a toast whose Undo applies `undo`, and no Undo when `undo` is empty. */
export function useUndoToast() {
  const store = useReplicaStore();
  const showToast = useToast();
  const undoLabel = t({ en: "Undo", zh: "撤销" });

  return (
    message: string,
    undo: readonly LocalMutationInput[],
    secondAction?: ToastAction,
  ) => {
    showToast({
      message,
      secondAction,
      action:
        undo.length === 0
          ? undefined
          : {
              label: undoLabel,
              onAction: () => {
                try {
                  applyAll(store, undo);
                } catch {
                  // The row changed again since; nothing is left to undo.
                }
              },
            },
    });
  };
}
