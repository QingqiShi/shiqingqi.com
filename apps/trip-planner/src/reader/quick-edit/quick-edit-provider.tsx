"use client";

import { t } from "@tuja/i18n";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useChangeToasts } from "#src/trips/save/use-change-toasts.ts";
import { useSaveQueue } from "#src/trips/save/use-save-queue.ts";
import type { Trip } from "#src/trips/types.ts";
import {
  QuickEditContext,
  type QuickEdit,
  type QuickEditTarget,
  useGoneMessage,
} from "./quick-edit-context.ts";
import { QuickEditSheet } from "./quick-edit-sheet.tsx";

/**
 * Lets a member who can edit change the trip in a few taps on the page that
 * reads it. Each change saves at once through the save queue, with Undo.
 * When someone else changed the same thing, the reader shows their version
 * and says so. The trip from the server starts the queue; each newer one
 * that the page gets, such as after a change on another screen, makes the
 * queue read the newest trip.
 */
export function QuickEditProvider({
  tripId,
  trip: serverTrip,
  isOwner,
  children,
}: {
  tripId: string;
  trip: Trip;
  isOwner: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { queue, state, isOnline } = useSaveQueue(tripId, serverTrip);
  const { saved, showToast } = useChangeToasts(queue, state);
  const [target, setTarget] = useState<QuickEditTarget | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const offlineMessage = t({
    en: "You are offline, so this is not saved. Try again with a connection.",
    zh: "你现在处于离线状态，这项修改没有保存。恢复连接后再试。",
  });
  const staleMessage = useGoneMessage();
  const refusedMessage = t({
    en: "The trip cannot take this change.",
    zh: "行程无法接受这项修改。",
  });
  const theirsMessage = t({
    en: "Someone else changed this a moment ago. The trip now shows their change.",
    zh: "其他人刚刚改过这里，现在显示的是他们的修改。",
  });

  useEffect(() => {
    queue.sync();
  }, [queue, serverTrip]);

  const conflictId =
    state.problem?.kind === "conflict" ? state.problem.batch.id : null;
  useEffect(() => {
    if (conflictId === null) return;
    queue.keepTheirs();
    router.refresh();
    showToast({ message: theirsMessage });
  }, [conflictId, queue, router, showToast, theirsMessage]);

  // The request can have reached the server, so the queue reads the trip
  // after it drops the change.
  const failedId =
    state.problem?.kind === "failed" ? state.problem.batch.id : null;
  useEffect(() => {
    if (failedId === null) return;
    queue.discard();
    queue.sync();
  }, [failedId, queue]);

  useEffect(() => {
    if (state.isGone) router.refresh();
  }, [state.isGone, router]);

  const quickEdit: QuickEdit = {
    tripId,
    isOwner,
    trip: state.trip,
    change(ops, message) {
      if (ops.length === 0) return true;
      // A toast does not show over the sheet, so the sheet goes first.
      if (!isOnline) {
        setIsOpen(false);
        showToast({ message: offlineMessage });
        return false;
      }
      const result = queue.submit(ops);
      if (!result.ok) {
        setIsOpen(false);
        showToast({
          message: result.refused === null ? staleMessage : refusedMessage,
        });
        return false;
      }
      saved(message);
      return true;
    },
    open(next) {
      setTarget(next);
      setOpenCount((count) => count + 1);
      setIsOpen(true);
    },
    close() {
      setIsOpen(false);
    },
  };

  return (
    <QuickEditContext value={state.isGone ? null : quickEdit}>
      {children}
      <QuickEditSheet
        target={target}
        openCount={openCount}
        isOpen={isOpen && !state.isGone}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </QuickEditContext>
  );
}
