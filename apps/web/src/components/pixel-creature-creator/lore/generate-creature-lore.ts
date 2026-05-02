import { generateText, Output, type LanguageModel } from "ai";
import "server-only";
import type { SupportedLocale } from "#src/types.ts";
import { species } from "../sprite/species";
import type { CreatureDef } from "../state/creature-schema";
import { loreOutputSchema, type LoreOutput } from "./lore-schema";

interface GenerateCreatureLoreInput {
  def: CreatureDef;
  locale: SupportedLocale;
}

export const SYSTEM_PROMPT = `You are the lore-keeper for "Pixel Creature Creator" — a small, friendly bestiary of imaginary pixel-art creatures. The user has just designed a creature and needs:

1. nameSuggestion — a short, evocative, made-up name (1–20 characters). Names must NOT echo any commercial monster-collecting franchise, real-world IP, brand, celebrity, or copyrighted character. Stay original and abstract. Whimsical fantasy names are best (e.g. "Sproutling", "Emberkit", "Tideflit"). Use ASCII letters only.
2. loreEn — exactly one English sentence (≤200 characters) that captures the creature's vibe. Match the creature's emotion and elemental type. Light, playful, evocative — not a wiki entry.
3. loreZh — one Simplified Chinese sentence (≤120 characters) that conveys the same vibe. Not a literal translation; let the rhythm fit Chinese prose. Same playful tone as loreEn.
4. type — pick the best-fitting elemental category from: leaf, ember, tide, dust, glow, frost, dawn, void. Usually echo the creature's existing type unless another fits the vibe better.

Output ONLY the structured object. No preamble, no markdown, no extra commentary.`;

function describeCreature(def: CreatureDef, locale: SupportedLocale): string {
  // Both locales get the same English description so the model has full
  // structured context. The bilingual output is produced by the schema —
  // not by switching the prompt language.
  const accessoriesLine =
    def.accessories.length === 0
      ? "no accessories"
      : `accessories: ${def.accessories.join(", ")}`;
  const namedLine =
    def.name.length > 0
      ? `The user has tentatively named it "${def.name}".`
      : "The user hasn't named it yet.";

  // Pass the species' English label rather than the raw ID so the model
  // sees a human-readable category (e.g. "Feline" not "feline").
  const speciesEntry = species[def.species];
  const speciesLine =
    speciesEntry !== undefined
      ? `${speciesEntry.label.en} (id: ${def.species})`
      : def.species;

  return [
    `Creature design:`,
    `- species: ${speciesLine}`,
    `- ${accessoriesLine}`,
    `- elemental type: ${def.type}`,
    `- default emotion: ${def.defaultEmotion}`,
    namedLine,
    `Active locale on the page: ${locale}.`,
    `Return both English and Chinese lore regardless of the active locale.`,
  ].join("\n");
}

/**
 * Generate a structured lore object for a designed creature.
 *
 * The `model` parameter is the entire dependency-injection seam:
 * - Production callers pass `getAnthropicModel()`.
 * - Tests pass `MockLanguageModelV3` from `ai/test`.
 *
 * The system prompt is marked as ephemeral-cached via Anthropic provider
 * options (mirrors the `addCacheControlToMessages` pattern in the chat
 * route) so repeated calls amortise the static instruction tokens.
 */
export async function generateCreatureLore(
  model: LanguageModel,
  input: GenerateCreatureLoreInput,
): Promise<LoreOutput> {
  const userPrompt = describeCreature(input.def, input.locale);

  const result = await generateText({
    model,
    output: Output.object({ schema: loreOutputSchema }),
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  return result.output;
}
