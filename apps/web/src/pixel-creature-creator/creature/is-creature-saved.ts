import { encodeCreature } from "./encode-creature";
import { savedCreaturesCache } from "./saved-creatures-cache";

/** Whether a Creature with this encoded hash is already saved. */
export function isCreatureSaved(encodedHash: string): boolean {
  if (typeof window === "undefined") return false;
  return savedCreaturesCache.snapshot.some(
    (entry) => encodeCreature(entry.def) === encodedHash,
  );
}
