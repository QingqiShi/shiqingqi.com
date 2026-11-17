import { sql } from "drizzle-orm";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import type { ModelUse } from "./ask-model.ts";

export interface AiRun {
  /** The trip of a change, or null for a draft. */
  tripId: string | null;
  kind: "edit" | "draft";
  model: string;
  status: "ok" | "invalid" | "failed" | "aborted" | "timeout";
  use: ModelUse;
  durationMs: number;
}

/**
 * Writes the counts of one request of the user to the model, never its
 * text. The database writes the row only for a signed-in user, and keeps the
 * trip only when the user is a member of it (`trips_log_ai_run`).
 */
export async function logAiRun(
  db: TripsDb,
  userId: string,
  run: AiRun,
): Promise<void> {
  const { use } = run;
  await asViewer(db, userId, (tx) =>
    tx.execute(
      sql`select public.trips_log_ai_run(${run.tripId}::uuid, ${run.kind}, ${run.model}, ${run.status}, ${use.rounds}::integer, ${use.inputTokens}::integer, ${use.outputTokens}::integer, ${use.cacheReadTokens}::integer, ${use.cacheWriteTokens}::integer, ${Math.round(run.durationMs)}::integer)`,
    ),
  );
}
