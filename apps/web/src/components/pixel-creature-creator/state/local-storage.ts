import { z } from "zod";
import {
  type CreatureDef,
  creatureDefSchema,
  migrateCreatureDef,
} from "./creature-schema";

/**
 * Persistence for saved creatures. Single-key blob; tiny enough that we
 * read/parse on every call rather than maintaining an in-memory cache that
 * could go stale across tabs.
 *
 * All localStorage operations are wrapped in try/catch — Safari private
 * mode, quota-exceeded, and storage-disabled environments throw on access.
 * Reads degrade to an empty list; writes are best-effort and never throw.
 */

export const PIXEL_CREATURE_CREATOR_SAVED_KEY = "pcc:saved:v1";
export const PIXEL_CREATURE_CREATOR_MAX_SAVED = 10;

export interface SavedCreature {
  id: string;
  def: CreatureDef;
  savedAt: number;
}

// Validate the persisted shape with Zod. The `def` field is parsed twice:
// once here (so the entry is well-formed) and once via `migrateCreatureDef`
// in `readAll` (so the def we hand back is the canonical migrated shape).
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

function readAll(): SavedCreature[] {
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

function writeAll(entries: SavedCreature[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      PIXEL_CREATURE_CREATOR_SAVED_KEY,
      JSON.stringify(entries),
    );
  } catch {
    // Quota exceeded / storage disabled — best-effort, swallow.
  }
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (shouldn't happen
  // in modern browsers + jsdom but keeps the function total).
  return `pcc-${String(Date.now())}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listSavedCreatures(): SavedCreature[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function saveCreature(def: CreatureDef): SavedCreature {
  const entry: SavedCreature = {
    id: generateId(),
    def,
    savedAt: Date.now(),
  };
  // Sort newest first, prepend the new entry, then cap.
  const next = [entry, ...readAll().sort((a, b) => b.savedAt - a.savedAt)];
  const capped = next.slice(0, PIXEL_CREATURE_CREATOR_MAX_SAVED);
  writeAll(capped);
  return entry;
}

export function deleteSavedCreature(id: string): void {
  const next = readAll().filter((entry) => entry.id !== id);
  writeAll(next);
}

export function clearSavedCreatures(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PIXEL_CREATURE_CREATOR_SAVED_KEY);
  } catch {
    // Storage disabled — best-effort, swallow.
  }
}
