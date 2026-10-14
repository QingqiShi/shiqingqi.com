import type { WriteScope } from "../db/repositories/types.ts";
import type { DerivedTouches } from "./derived-touches.ts";
import type { WriteActor } from "./labelled-by-after.ts";
import type { HouseholdRow, SyncRows, SyncTableName } from "./row-schemas.ts";

/**
 * Why the server did not apply a mutation. `deleted`: the row was deleted
 * first. `invalid`: the mutation breaks a rule. `forbidden`: the row belongs
 * to another Household. `not_found`: the row does not exist.
 */
export type RejectionReason = "invalid" | "forbidden" | "deleted" | "not_found";

export interface Rejection {
  id: string;
  reason: RejectionReason;
  message?: string;
}

export interface PushResponse {
  applied: string[];
  rejected: Rejection[];
  clock: number;
}

/**
 * What a committed mutation changed that work after the push must follow.
 * `institution-changed`: an account has a new institution name, website
 * domain or currency, so its institution icon must be worked out again.
 */
export type PushEffect = "institution-changed";

/** The answer to `GET /api/finance/sync?since=<clock>` when `since` is above 0. */
export interface PullResponse {
  clock: number;
  household: HouseholdRow;
  tables: Partial<SyncRows>;
}

/**
 * One line of the NDJSON bootstrap (`since=0`). The stream is complete only
 * when the `end` line arrives.
 */
export type BootstrapLine =
  | { type: "start"; clock: number; household: HouseholdRow }
  | { type: "rows"; table: SyncTableName; rows: SyncRows[SyncTableName] }
  | { type: "end"; clock: number };

/** What every mutation needs while a batch is written. */
export interface WriteContext {
  scope: WriteScope;
  /** Today in the Household's time zone. */
  today: string;
  touches: DerivedTouches;
  actor: WriteActor;
}
