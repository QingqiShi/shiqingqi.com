import { z } from "zod";
import { creatureDefSchema, migrateCreatureDef } from "../creature-def-schema";
import { PIXEL_CREATURE_CREATOR_SAVED_KEY } from "./constants";
import type { SavedCreature } from "./types";

/**
 * Read every saved Creature out of localStorage, in stored order.
 *
 * Single-key blob; tiny enough to read and parse on every call. Only
 * `savedCreaturesCache` holds the parsed list, and it drops it on every write
 * and cross-tab `storage` event. Safari private mode, quota-exceeded, and
 * storage-disabled environments throw on access, so reads degrade to an
 * empty list.
 */
export function readSavedCreatures(): SavedCreature[] {
  const raw = readRaw();
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  // Per-entry validation: a single bad entry should not invalidate the
  // entire saved list. We narrow `parsed` to an array via Zod (no type
  // assertions) and then run each element through the entry schema.
  const arrayResult = z.array(z.unknown()).safeParse(parsed);
  if (!arrayResult.success) return [];
  const valid: SavedCreature[] = [];
  for (const element of arrayResult.data) {
    const entryResult = persistedEntrySchema.safeParse(element);
    if (!entryResult.success) continue;
    const migrated = migrateCreatureDef(entryResult.data.def);
    if (migrated !== null) {
      valid.push({
        id: entryResult.data.id,
        def: migrated,
        savedAt: entryResult.data.savedAt,
      });
    }
  }
  return valid;
}

// Validate the persisted shape with Zod. The `def` field is parsed twice:
// once here (so the entry is well-formed) and once via `migrateCreatureDef`
// below (so the def we hand back is the canonical migrated shape).
const persistedEntrySchema = z.object({
  id: z.string(),
  savedAt: z.number(),
  def: creatureDefSchema,
});

function readRaw(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(PIXEL_CREATURE_CREATOR_SAVED_KEY);
  } catch {
    return null;
  }
}
