import { sql } from "drizzle-orm";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import type { ModelUse } from "./empty-use.ts";

export interface AiRun {
  /** The trip of a change, or null for a draft. */
  tripId: string | null;
  /** `assistant` is one turn of the trip assistant; `summary` is the summary of one of its segments; `research` is one call of its research sub-agent; `reader` is one call of its reader sub-agent, for the files of one message. */
  kind: "edit" | "draft" | "assistant" | "summary" | "research" | "reader";
  model: string;
  status: "ok" | "invalid" | "failed" | "aborted" | "timeout";
  use: ModelUse;
  durationMs: number;
  /** For a research run: the web searches and the page fetches that it made. */
  web?: { searches: number; fetches: number };
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
  const { use, web } = run;
  await asViewer(db, userId, (tx) =>
    tx.execute(
      sql`select public.trips_log_ai_run(${run.tripId}::uuid, ${run.kind}, ${run.model}, ${run.status}, ${use.rounds}::integer, ${use.inputTokens}::integer, ${use.outputTokens}::integer, ${use.cacheReadTokens}::integer, ${use.cacheWriteTokens}::integer, ${Math.round(run.durationMs)}::integer, ${web?.searches ?? null}::integer, ${web?.fetches ?? null}::integer)`,
    ),
  );
}
