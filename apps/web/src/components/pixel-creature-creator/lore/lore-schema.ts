import { z } from "zod";
import { TYPE_IDS } from "../sprite/sprites";

/**
 * Literal-tuple of supported creature types. The runtime registry exports
 * `TYPE_IDS` as a plain `string[]` (so it can flow into the Zod refines in
 * `creature-schema`); for the lore output we want the tighter `z.enum(...)`
 * shape so the AI's `type` field is constrained at parse time.
 *
 * The `assertTypesInSync` invariant below pins this list to the registry —
 * if a new type is registered without updating `TYPE_OPTIONS`, the module
 * throws on import rather than silently letting the AI return a stale ID.
 */
export const TYPE_OPTIONS = [
  "leaf",
  "ember",
  "tide",
  "dust",
  "glow",
  "frost",
  "dawn",
  "void",
] as const;

export type LoreType = (typeof TYPE_OPTIONS)[number];

function assertTypesInSync(): void {
  // Compare both sides as `string[]`/`Set<string>` so the literal-tuple
  // narrowing of `TYPE_OPTIONS` doesn't force a type assertion when checking
  // membership against the registry's `string[]` shape.
  const expected: Set<string> = new Set(TYPE_OPTIONS);
  if (expected.size !== TYPE_IDS.length) {
    throw new Error(
      `TYPE_OPTIONS (${String(expected.size)}) and TYPE_IDS (${String(
        TYPE_IDS.length,
      )}) drifted — update lore-schema.ts to match the sprite registry.`,
    );
  }
  for (const id of TYPE_IDS) {
    if (!expected.has(id)) {
      throw new Error(
        `Type "${id}" exists in the sprite registry but not in TYPE_OPTIONS — update lore-schema.ts.`,
      );
    }
  }
}

assertTypesInSync();

export const loreOutputSchema = z.object({
  nameSuggestion: z.string().min(1).max(20),
  loreEn: z.string().min(1).max(200),
  loreZh: z.string().min(1).max(120),
  type: z.enum(TYPE_OPTIONS),
});

export type LoreOutput = z.infer<typeof loreOutputSchema>;
