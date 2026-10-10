import { t } from "#src/i18n.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useToast } from "../shell/toast-provider.tsx";
import {
  useUndoableMutations,
  type UndoableToast,
} from "../shell/use-undoable-mutations.ts";
import { MutationError } from "../sync/mutation-error.ts";

/**
 * Applies Settings changes to the Replica, in order. With `toast`, the batch
 * is all or nothing and a toast with Undo says what changed. Without it, the
 * changes before a refused one stay. When one is refused (the server would
 * refuse it too), it says why and returns false.
 */
export function useApplyMutations() {
  const store = useReplicaStore();
  const showToast = useToast();
  const applyUndoable = useUndoableMutations();
  const messages = {
    refused: t({
      en: "That change was not saved. Check the name is not already used.",
      zh: "此修改未能保存。请检查名称是否已被使用。",
    }),
    gone: t({
      en: "That change was not saved: the item was deleted on another device.",
      zh: "此修改未能保存：该项已在其他设备上删除。",
    }),
    forbidden: t({
      en: "Only the owner can make that change.",
      zh: "只有所有者可以进行此修改。",
    }),
  };
  return (
    mutations: readonly LocalMutationInput[],
    toast?: UndoableToast,
  ): boolean => {
    try {
      if (toast) applyUndoable(mutations, toast);
      else for (const mutation of mutations) store.applyLocal(mutation);
      return true;
    } catch (error) {
      const reason = error instanceof MutationError ? error.reason : null;
      showToast({
        message:
          reason === "deleted" || reason === "not_found"
            ? messages.gone
            : reason === "forbidden"
              ? messages.forbidden
              : messages.refused,
      });
      return false;
    }
  };
}
