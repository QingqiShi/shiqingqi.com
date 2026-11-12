import "server-only";
import type { PublicPetState } from "#src/pet/types.ts";
import { devFixtureUploads } from "#src/server/dev/dev-fixture-uploads.ts";
import { readCachedPublicPetState } from "#src/server/read-public-pet-state.ts";
import { combineSnapshots } from "#src/server/snapshot/combine-snapshots.ts";
import { nextSnapshot } from "#src/server/snapshot/next-snapshot.ts";

type DemoPetState = {
  state: PublicPetState;
  /** A real account's pet, which the page then keeps fresh as a visitor's page does. */
  isLive: boolean;
};

const SAMPLE_USER = "sample";

/** The fixture pet of `pnpm dev`, awake as of `now`, for when no real account can be shown. */
function samplePetState(now: number): PublicPetState {
  return {
    ...combineSnapshots(
      SAMPLE_USER,
      devFixtureUploads(now).map(({ body }) =>
        nextSnapshot(null, body, body.at),
      ),
    ),
    visitors: { fed: 0, patted: 0 },
  };
}

/**
 * The pet the home page shows: the account `BUDDY_DEMO_USER` names, through the same read as
 * any visitor's, so a page made private leaves the demo too. Without that account, a sample, so
 * the doorway always has a living pet in it.
 */
export async function readDemoPetState(now: number): Promise<DemoPetState> {
  const user = process.env.BUDDY_DEMO_USER;
  if (user !== undefined && user !== "") {
    try {
      const state = await readCachedPublicPetState(user);
      if (state !== null) return { state, isLive: true };
    } catch {
      // Without a store the doorway still opens, on the sample.
    }
  }
  return { state: samplePetState(now), isLive: false };
}
