"use client";

import { t } from "@tuja/i18n";
import { createContext, use } from "react";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import type { Trip } from "#src/trips/types.ts";

/** The thing whose quick changes the sheet shows: an item, the time of a moment, or the details of the trip. */
export type QuickEditTarget =
  | { kind: "item"; id: string }
  | { kind: "moment"; id: string }
  | { kind: "trip" };

export interface QuickEdit {
  tripId: string;
  /** True when the person owns the trip, and so can delete it. */
  isOwner: boolean;
  /** The trip with each change of the person applied: what the reader shows. */
  trip: Trip;
  /**
   * Makes a change: shows it at once, saves it, and offers Undo in a toast
   * with `message`. False when the change cannot be made; a toast says why.
   */
  change: (ops: readonly DraftOp[], message: string) => boolean;
  /** Opens the sheet with the quick changes of a thing. */
  open: (target: QuickEditTarget) => void;
  /** Closes that sheet. */
  close: () => void;
}

export const QuickEditContext = createContext<QuickEdit | null>(null);

/**
 * The quick changes of the reader, or null where the person cannot change
 * the trip, or the trip is gone.
 */
export function useQuickEdit(): QuickEdit | null {
  return use(QuickEditContext);
}

/** The words that say a thing is no longer in the trip. */
export function useGoneMessage(): string {
  return t({
    en: "The trip changed, and this is no longer in it.",
    zh: "行程已有变动，这一项已不在其中。",
  });
}
