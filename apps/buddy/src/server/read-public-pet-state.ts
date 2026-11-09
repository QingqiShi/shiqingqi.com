import { unstable_cache } from "next/cache";
import "server-only";
import type { PublicPetState } from "#src/pet/types.ts";
import { readPetState } from "./snapshot/read-pet-state.ts";
import { getBuddyBackend } from "./store/get-buddy-backend.ts";

/** The cache tag of the page's read of `user`. The visibility toggle expires it. */
export function petStateTag(user: string) {
  return `buddy-pet-state:${user}`;
}

/** Null for a name that no account has and for a private page. */
export function readPublicPetState(
  user: string,
): Promise<PublicPetState | null> {
  return readPetState(getBuddyBackend().kv, user, { withVisitors: true });
}

export function readCachedPublicPetState(
  user: string,
): Promise<PublicPetState | null> {
  return unstable_cache(
    () => readPublicPetState(user),
    ["buddy-public-pet-state", user],
    { revalidate: 30, tags: [petStateTag(user)] },
  )();
}

/** The owner's own view, also of a private page. Not cached, so the owner sees the toggle's result at once. */
export function readOwnPetState(user: string): Promise<PublicPetState | null> {
  return readPetState(getBuddyBackend().kv, user, {
    includePrivate: true,
    withVisitors: true,
  });
}
