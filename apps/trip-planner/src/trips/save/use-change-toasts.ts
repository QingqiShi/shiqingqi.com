import { t } from "@tuja/i18n";
import { useToast } from "@tuja/ui/components/toast-provider";
import { useEffect } from "react";
import type { QueueState, SaveQueue } from "./create-save-queue.ts";

/**
 * The toasts of a save queue: a saved change with Undo, the answer to Undo,
 * a change that the queue dropped, and a request that failed.
 */
export function useChangeToasts(queue: SaveQueue, state: QueueState) {
  const showToast = useToast();
  const undoLabel = t({ en: "Undo", zh: "撤销" });
  const undone = t({ en: "Change taken back", zh: "已撤销" });
  const cannotUndo = t({
    en: "That change can no longer be taken back.",
    zh: "这项修改已无法撤销。",
  });
  const notSavedMessage = t({
    en: "That change is not saved",
    zh: "这项修改没有保存",
  });
  const droppedMessage = t({
    en: "A change could not be saved, because the trip has changed. The trip shows as it is now.",
    zh: "行程已有变动，有一项修改未能保存。现在显示的是最新的行程。",
  });

  useEffect(
    () =>
      queue.onDropped(() => {
        showToast({ message: droppedMessage });
      }),
    [queue, showToast, droppedMessage],
  );

  // The toast of a change says that it is saved before the server answers.
  // When the request fails, this takes its place.
  const failedId =
    state.problem?.kind === "failed" ? state.problem.batch.id : null;
  useEffect(() => {
    if (failedId !== null) showToast({ message: notSavedMessage });
  }, [failedId, showToast, notSavedMessage]);

  /** Takes back the newest change, and says so, unless a conflict will ask the person first. */
  const undo = () => {
    const result = queue.undo();
    if (result !== "asks") {
      showToast({ message: result === "taken" ? undone : cannotUndo });
    }
    return result;
  };

  return {
    undo,
    /** Says that a change is made, with Undo. */
    saved: (message: string) => {
      showToast({ message, action: { label: undoLabel, onAction: undo } });
    },
    showToast,
  };
}
