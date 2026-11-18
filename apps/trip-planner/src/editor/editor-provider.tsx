"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import {
  arriveAt,
  forgetArrival,
  replaceTripLocation,
  type TripLocation,
} from "#src/reader/use-trip-location.ts";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import type {
  QueueState,
  SaveQueue,
} from "#src/trips/save/create-save-queue.ts";
import { useChangeToasts } from "#src/trips/save/use-change-toasts.ts";
import { useSaveQueue } from "#src/trips/save/use-save-queue.ts";
import type { Trip } from "#src/trips/types.ts";
import { readerAnchor } from "./reader-anchor.ts";

/** What a row shows about a change to its thing that the server does not have yet. */
export type RowStatus = "saving" | "failed" | "conflict" | null;

interface Editor {
  tripId: string;
  /** The trip with each change of the person applied. */
  trip: Trip;
  isOwner: boolean;
  state: QueueState;
  queue: SaveQueue;
  /** False with no connection, and when the trip is gone: the edit controls are off. */
  canEdit: boolean;
  isOnline: boolean;
  /**
   * Makes a change: shows it at once, saves it, and offers Undo in a toast
   * with `message`. When the change cannot be made, it gives the words that
   * say why.
   */
  change: (
    ops: readonly DraftOp[],
    options: {
      message: string;
      /** The day that the reader opens at after the change. */
      dayId?: string;
      /** The moment or the item that the reader opens with in view. */
      thingId?: string;
      /** Shows no toast: the caller says what happened. */
      quiet?: boolean;
    },
  ) => { ok: true; batchId?: number } | { ok: false; message: string };
  /** Takes back the newest change, and says so in a toast. It gives what the queue's `undo` gives. */
  undo: () => "taken" | "asks" | "none";
  statusOf: (id: string) => RowStatus;
  /** Whether the person made a change since the screen opened. */
  hasChanged: boolean;
  /**
   * Shows where a thing that is new or that moved is now, after the screen
   * shows it: marks its row for a moment, and scrolls only when the row is
   * not clear of the bars and the toast.
   */
  reveal: (id: string) => void;
  /** Says a thing in a toast that stays when the person leaves this screen. */
  announce: (message: string) => void;
  /** The row that `reveal` marks now. */
  markedId: string | null;
  /** A ref for the element of a row, so that a sheet can grow from it and go back into it. */
  rowRef: (id: string) => (element: HTMLElement | null) => void;
  rowElement: (id: string) => HTMLElement | null;
}

/** How long a row keeps the mark of `reveal`, in ms. */
const MARK_MS = 2500;
/** The part of the screen that the bar at the top covers, in px. */
const TOP_COVER = 96;
/** The part of the screen that the tab bar, the prompt and a toast cover at the bottom, in px. */
const BOTTOM_COVER = 260;

const EditorContext = createContext<Editor | null>(null);

export function useEditor(): Editor {
  const editor = use(EditorContext);
  if (!editor) throw new Error("useEditor must be used within EditorProvider");
  return editor;
}

/**
 * The state of the edit screen of one trip: the save queue, the connection,
 * and the elements of the rows. The trip from the server is the start
 * only. After that, the trip is what the queue's own requests answered,
 * because a refreshed page can arrive later than a newer answer.
 */
export function EditorProvider({
  tripId,
  trip: firstTrip,
  isOwner,
  announce,
  children,
}: {
  tripId: string;
  trip: Trip;
  isOwner: boolean;
  announce: (message: string) => void;
  children: ReactNode;
}) {
  const readerPath = getLocalePath(`/${tripId}`, useLocale());
  const { queue, state, isOnline } = useSaveQueue(tripId, firstTrip);
  const { undo, saved } = useChangeToasts(queue, state);
  const [rows] = useState(() => new Map<string, HTMLElement>());
  const [hasChanged, setHasChanged] = useState(false);
  const [markedId, setMarkedId] = useState<string | null>(null);

  const offlineMessage = t({
    en: "You are offline, so this is not saved. Try again with a connection.",
    zh: "你现在处于离线状态，这项修改没有保存。恢复连接后再试。",
  });
  const staleMessage = t({
    en: "The trip changed, and this is no longer in it. Close this and look at the trip again.",
    zh: "行程已有变动，这一项已不在其中。请关闭后重新查看行程。",
  });
  const refusedMessage = t({
    en: "The trip cannot take this change. Check what you entered.",
    zh: "行程无法接受这项修改，请检查填写的内容。",
  });
  // The reader opens at the place that this screen names only when the
  // person goes from this screen to the reader: at the top of the day that
  // its hash names, until a change names a day and a thing. After a visit
  // to another page, the trip opens at today.
  useEffect(() => {
    arriveAt(readerPath, null);
    return () => {
      if (window.location.pathname !== readerPath) forgetArrival();
    };
  }, [readerPath]);

  useEffect(() => {
    if (markedId === null) return undefined;
    const timer = setTimeout(() => {
      setMarkedId(null);
    }, MARK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [markedId]);

  const statusOf = (id: string): RowStatus => {
    const { problem, pending } = state;
    if (problem?.batch.touches.includes(id)) return problem.kind;
    return pending.some((batch) => batch.touches.includes(id))
      ? "saving"
      : null;
  };

  const editor: Editor = {
    tripId,
    trip: state.trip,
    isOwner,
    state,
    queue,
    isOnline,
    canEdit: isOnline && !state.isGone,
    change(ops, { message, dayId, thingId, quiet = false }) {
      if (ops.length === 0) return { ok: true };
      if (!isOnline) return { ok: false, message: offlineMessage };
      const result = queue.submit(ops);
      if (!result.ok) {
        return {
          ok: false,
          message: result.refused === null ? staleMessage : refusedMessage,
        };
      }
      setHasChanged(true);
      const changed = queue.getState().trip;
      const dayIndex = changed.days.findIndex((day) => day.id === dayId);
      if (dayIndex >= 0) {
        // The reader opens at the day of the last change, with the thing
        // that changed in view.
        const location: TripLocation = { view: "day", day: dayIndex };
        replaceTripLocation(location);
        arriveAt(
          readerPath,
          location,
          thingId ? readerAnchor(changed, thingId) : null,
        );
      }
      if (!quiet) saved(message);
      return { ok: true, batchId: result.batchId };
    },
    undo,
    statusOf,
    hasChanged,
    markedId,
    reveal(id) {
      setMarkedId(id);
      requestAnimationFrame(() => {
        const row = rows.get(id);
        if (!row) return;
        const { top, bottom } = row.getBoundingClientRect();
        if (top < TOP_COVER || bottom > window.innerHeight - BOTTOM_COVER) {
          row.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      });
    },
    announce,
    rowRef: (id) => (element) => {
      if (element) rows.set(id, element);
      else rows.delete(id);
    },
    rowElement: (id) => rows.get(id) ?? null,
  };

  return <EditorContext value={editor}>{children}</EditorContext>;
}
