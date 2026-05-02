import { z } from "zod";
import { SPECIES_IDS } from "../sprite/species/ids";
import { ACCESSORY_IDS, TYPE_IDS } from "../sprite/sprites";

/**
 * Pixel Creature Creator — versioned schema for a creature definition.
 *
 * `v: 2` collapses the original body/head/eyeStyle/palette axes into a
 * single `species` axis backed by hand-authored sprites. v:1 inputs are
 * rejected outright — old share URLs decode to null and callers fall back
 * to the default creature.
 */

export const EMOTIONS = [
  "idle",
  "joy",
  "sad",
  "excited",
  "sleepy",
  "grumpy",
  "curious",
] as const;

export const emotionSchema = z.enum(EMOTIONS);

export type Emotion = z.infer<typeof emotionSchema>;

/**
 * Hard cap on creature names. Mirrored by the wizard textarea's
 * `maxLength` and enforced by the schema so encoded URLs can never smuggle
 * in a longer string than the UI permits.
 */
export const NAME_MAX_LENGTH = 20;

const speciesIdSchema = z
  .string()
  .min(1)
  .refine((id) => SPECIES_IDS.includes(id), { message: "Unknown species" });
const accessoryIdSchema = z
  .string()
  .min(1)
  .refine((id) => ACCESSORY_IDS.includes(id), { message: "Unknown accessory" });
const typeIdSchema = z
  .string()
  .min(1)
  .refine((id) => TYPE_IDS.includes(id), { message: "Unknown type" });

export const creatureDefSchema = z
  .object({
    v: z.literal(2),
    species: speciesIdSchema,
    accessories: z
      .array(accessoryIdSchema)
      .max(2)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Accessories must be unique",
      }),
    type: typeIdSchema,
    defaultEmotion: emotionSchema,
    name: z.string().max(NAME_MAX_LENGTH),
  })
  .strict();

export type CreatureDef = z.infer<typeof creatureDefSchema>;

export const DEFAULT_CREATURE: CreatureDef = {
  v: 2,
  species: "feline",
  accessories: [],
  type: "leaf",
  defaultEmotion: "idle",
  name: "",
};

/**
 * Parse arbitrary input into a `CreatureDef`. Returns `null` for any
 * validation failure — callers decide how to recover (defaults, errors).
 *
 * v:1 inputs (the old multi-axis schema) fail the literal check and return
 * null; the wizard treats that as "no deep-link" and seeds a fresh random
 * creature instead.
 */
export function migrateCreatureDef(input: unknown): CreatureDef | null {
  const result = creatureDefSchema.safeParse(input);
  return result.success ? result.data : null;
}
