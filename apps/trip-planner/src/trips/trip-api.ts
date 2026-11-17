import { ApiError } from "@tuja/auth-ui/api-error";
import { fetchJson, postJson } from "@tuja/auth-ui/fetch-json";
import { useRouter } from "next/navigation";
import type { NewTrip } from "./ops/new-trip.ts";
import type { Op } from "./ops/op-schema.ts";
import type { ChangeResult } from "./write-trips.ts";

/** The answers of `change` that are not a failed request. */
const ANSWERS = new Set([200, 404, 409, 422]);

/**
 * Makes, changes and deletes trips from the browser, as the signed-in user.
 * A failed request, such as one with no session (401), throws `ApiError`.
 * A page that the client has fetched shows the old trip until
 * `router.refresh()`; `useTripApi` does that after each change.
 */
export const tripApi = {
  /** Makes a trip with the user as its owner, and gives its id, which is its path. */
  async create(input: NewTrip): Promise<string> {
    const { tripId } = await postJson<{ tripId: string }>("/api/trips", input);
    return tripId;
  },

  /** Applies a batch of ops to the newest trip, all or none. Make the ops with `withExpect`. */
  async change(tripId: string, ops: readonly Op[]): Promise<ChangeResult> {
    const response = await fetch("/api/trips/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ tripId, ops }),
    });
    if (!ANSWERS.has(response.status)) {
      const body: unknown = await response.json().catch(() => null);
      throw new ApiError("request_failed", response.status, body);
    }
    return (await response.json()) as ChangeResult;
  },

  /** Deletes a trip that the user owns. False when the user does not own it. */
  async remove(tripId: string): Promise<boolean> {
    try {
      await fetchJson("/api/trips/delete", {
        method: "POST",
        body: JSON.stringify({ tripId }),
      });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return false;
      throw error;
    }
  },
};

/** `tripApi`, with a refresh of the pages of the app after each change that lands. */
export function useTripApi(): typeof tripApi {
  const router = useRouter();
  return {
    async create(input) {
      const tripId = await tripApi.create(input);
      router.refresh();
      return tripId;
    },
    async change(tripId, ops) {
      const result = await tripApi.change(tripId, ops);
      if (result.status === "applied") router.refresh();
      return result;
    },
    async remove(tripId) {
      const deleted = await tripApi.remove(tripId);
      if (deleted) router.refresh();
      return deleted;
    },
  };
}
