import { bindDraftDays, type TripDraft } from "#src/ai/ai-api.ts";
import { withExpect } from "#src/trips/ops/apply-ops.ts";
import type { Op } from "#src/trips/ops/op-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import type { ChangeResult } from "#src/trips/write-trips.ts";

export interface FillApi {
  read: (tripId: string) => Promise<Trip | null>;
  change: (tripId: string, ops: readonly Op[]) => Promise<ChangeResult>;
}

/** How many batches of the draft the trip got, of how many. */
export interface Filled {
  saved: number;
  total: number;
}

/**
 * Saves the batches of a draft to the trip made from its fields, one after
 * the other. Each batch gets its `expect` from the trip that the save before
 * it gave back, as the editor's save queue does. It stops at the first batch
 * that does not save and never throws, so that the person always gets to the
 * trip that exists.
 */
export async function fillNewTrip(
  draft: Pick<TripDraft, "dayIds" | "batches">,
  tripId: string,
  api: FillApi,
): Promise<Filled> {
  const total = draft.batches.length;
  let saved = 0;
  if (total === 0) return { saved, total };
  try {
    let trip = await api.read(tripId);
    if (trip === null) return { saved, total };
    for (const batch of bindDraftDays(draft, trip)) {
      const result = await api.change(tripId, withExpect(trip, batch.ops));
      if (result.status !== "applied") break;
      trip = result.trip;
      saved++;
    }
  } catch {
    // A failed request ends the fill. The batches before it are saved.
  }
  return { saved, total };
}
