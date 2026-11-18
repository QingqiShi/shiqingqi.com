import { fetchJson } from "@tuja/auth-ui/fetch-json";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import type { Trip } from "#src/trips/types.ts";
import type {
  DraftBatch,
  Proposal,
  ProposedBatch,
  TripDraft,
} from "./check-proposal.ts";

export type { Proposal, TripDraft, ProposedBatch };

export interface ProposeInput {
  tripId: string;
  /** What the person asks for, 1 to 4000 characters. */
  prompt: string;
  /** The day on screen, for "this day". */
  dayId?: string;
}

export interface DraftInput {
  /** The pasted plan, 1 to 50000 characters. */
  text: string;
  /** The person's own time zone, for a plan that does not say where it is. */
  timeZone: string;
  locale: "en" | "zh";
}

/** The keys of an op whose text can be the id of a day. */
const DAY_ID_KEYS = new Set(["id", "dayId", "before"]);

async function post<T>(path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetchJson(
    path,
    { method: "POST", body: JSON.stringify(body), signal },
    "request_failed",
  );
  return (await response.json()) as T;
}

/**
 * Asks the model from the browser, as the signed-in user. Neither call saves
 * anything: send each batch that the person accepts through the save queue.
 * A failure throws `ApiError`: 401 with no session, 404 for a trip that the
 * user cannot edit, 502 or 504 with a `reason` in its body when the model
 * gave no answer that applies, and 503 when no model is set up.
 */
export const aiApi = {
  /**
   * Changes for a trip, which apply in order to the newest trip, each batch
   * whole. The ops carry the `expect` of the trip that the model read, so
   * check a batch with `applyOps` as it is. An empty `batches` with a
   * `message` is an answer too.
   */
  propose(input: ProposeInput, signal?: AbortSignal): Promise<Proposal> {
    return post("/api/trips/propose", input, signal);
  },

  /**
   * A new trip from pasted text. Make it with `tripApi.create(draft.fields)`,
   * read it, and apply `bindDraftDays(draft, trip)` in order.
   */
  draft(input: DraftInput, signal?: AbortSignal): Promise<TripDraft> {
    return post("/api/trips/draft", input, signal);
  },
};

/**
 * The batches of a draft with the ids of the made trip's days in place of
 * the draft's. Both trips have the same days, in the same order.
 */
export function bindDraftDays(
  draft: Pick<TripDraft, "dayIds" | "batches">,
  trip: Pick<Trip, "days">,
): DraftBatch[] {
  const ids = new Map(
    draft.dayIds.map((id, i) => {
      const day = trip.days.at(i);
      if (!day) throw new Error("The trip has fewer days than the draft.");
      return [id, day.id];
    }),
  );
  return draft.batches.map((batch) => ({
    summary: batch.summary,
    dayIds: batch.dayIds.map((id) => ids.get(id) ?? id),
    ops: JSON.parse(JSON.stringify(batch.ops), (key, value: unknown) =>
      DAY_ID_KEYS.has(key) && typeof value === "string"
        ? (ids.get(value) ?? value)
        : value,
    ) as DraftOp[],
  }));
}
