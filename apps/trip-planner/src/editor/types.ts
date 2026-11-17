import type { Day, Moment } from "#src/trips/types.ts";
import type { LocatedItem } from "./build-outline.ts";

/** What the one sheet of the edit screen shows. */
export type SheetTarget =
  | { kind: "item"; found: LocatedItem }
  | { kind: "add"; dayId: string }
  | { kind: "moment"; moment: Moment; dayId: string }
  | { kind: "day"; day: Day }
  | { kind: "trip" }
  | { kind: "conflict" }
  | { kind: "leave" };

/** Opens the sheet on a target. The sheet grows from the row with `rowId`. */
export type OpenSheet = (target: SheetTarget, rowId: string) => void;
