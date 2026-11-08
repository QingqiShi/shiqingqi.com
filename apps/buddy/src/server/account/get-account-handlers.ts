import { revalidateTag } from "next/cache";
import "server-only";
import { getBuddyDb } from "../db/get-buddy-db.ts";
import { getMachineRegistry } from "../machines/get-machine-registry.ts";
import { petStateTag, readOwnPetState } from "../read-public-pet-state.ts";
import { makeAccountHandlers } from "./make-account-handlers.ts";

export function getAccountHandlers() {
  return makeAccountHandlers({
    getDb: getBuddyDb,
    registry: getMachineRegistry(),
    readOwnPetState,
    onVisibilityChanged: (name) => {
      revalidateTag(petStateTag(name), { expire: 0 });
    },
    now: () => new Date(),
  });
}
