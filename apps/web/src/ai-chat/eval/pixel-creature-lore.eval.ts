import { describe, expect, it } from "vitest";
import { generateCreatureLore } from "#src/components/pixel-creature-creator/lore/generate-creature-lore.ts";
import {
  DEFAULT_CREATURE,
  type CreatureDef,
} from "#src/components/pixel-creature-creator/state/creature-schema.ts";
import { getAnthropicModel } from "../client";
import { judge } from "./judge";
import { throttle } from "./throttle";

interface LoreEvalCase {
  name: string;
  def: CreatureDef;
  vibe: string;
}

const cases: LoreEvalCase[] = [
  {
    name: "Default feline, idle and gentle",
    def: DEFAULT_CREATURE,
    vibe: "leaf-type feline, idle, gentle and grounded",
  },
  {
    name: "Joyful piscine with a bow",
    def: {
      ...DEFAULT_CREATURE,
      species: "piscine",
      accessories: ["bow"],
      type: "tide",
      defaultEmotion: "joy",
      name: "",
    },
    vibe: "tide-type fish, joyful, bouncy and fond of waves",
  },
  {
    name: "Grumpy ember draconic with glasses",
    def: {
      ...DEFAULT_CREATURE,
      species: "draconic",
      accessories: ["glasses"],
      type: "ember",
      defaultEmotion: "grumpy",
      name: "",
    },
    vibe: "ember-type dragon, grumpy, smouldering and a touch academic",
  },
  {
    name: "Sleepy dust amorphous with a scarf",
    def: {
      ...DEFAULT_CREATURE,
      species: "amorphous",
      accessories: ["scarf"],
      type: "dust",
      defaultEmotion: "sleepy",
      name: "",
    },
    vibe: "dust-type blob, sleepy, drowsy and powdery",
  },
  {
    name: "Curious glow insectoid with antenna",
    def: {
      ...DEFAULT_CREATURE,
      species: "insectoid",
      accessories: ["antenna"],
      type: "glow",
      defaultEmotion: "curious",
      name: "",
    },
    vibe: "glow-type bug, curious, luminous and inquisitive",
  },
  {
    name: "Excited frost avian with a hat",
    def: {
      ...DEFAULT_CREATURE,
      species: "avian",
      accessories: ["hat"],
      type: "frost",
      defaultEmotion: "excited",
      name: "",
    },
    vibe: "frost-type bird, excited, crystalline and shivery",
  },
  {
    name: "Joyful dawn plant-like with a leaf and bow",
    def: {
      ...DEFAULT_CREATURE,
      species: "plant-like",
      accessories: ["leaf", "bow"],
      type: "dawn",
      defaultEmotion: "joy",
      name: "",
    },
    vibe: "dawn-type sprout, joyful, golden-hour warm and hopeful",
  },
  {
    name: "Grumpy void serpentine, no accessories",
    def: {
      ...DEFAULT_CREATURE,
      species: "serpentine",
      accessories: [],
      type: "void",
      defaultEmotion: "grumpy",
      name: "",
    },
    vibe: "void-type serpent, grumpy, shadowy and silent",
  },
];

describe("Pixel creature lore", () => {
  it.each(cases)(
    "$name — produces bilingual on-vibe lore",
    async (evalCase) => {
      await throttle.waitIfNeeded();
      const result = await generateCreatureLore(getAnthropicModel(), {
        def: evalCase.def,
        locale: "en",
      });
      // Schema-side limits already enforce length; the eval double-checks the
      // structural contract on top of the qualitative judge below.
      expect(result.nameSuggestion.length).toBeGreaterThan(0);
      expect(result.nameSuggestion.length).toBeLessThanOrEqual(20);
      expect(result.loreEn.length).toBeGreaterThan(0);
      expect(result.loreEn.length).toBeLessThanOrEqual(200);
      expect(result.loreZh.length).toBeGreaterThan(0);
      expect(result.loreZh.length).toBeLessThanOrEqual(120);

      // Quick brand-safety pass before the judge runs.
      const lower = result.nameSuggestion.toLowerCase();
      expect(lower.includes("pokemon"), "name avoids Pokemon").toBe(false);
      expect(lower.includes("pokémon"), "name avoids Pokémon").toBe(false);
      expect(lower.includes("digimon"), "name avoids Digimon").toBe(false);

      const judgeContent =
        `Creature attributes: ${JSON.stringify(evalCase.def)}\n` +
        `Intended vibe: ${evalCase.vibe}\n` +
        `Generated lore: ${JSON.stringify(result)}`;

      const judgeResult = await judge({
        userMessage: judgeContent,
        response: result.loreEn,
        criteria: [
          "The English lore line is one short, evocative sentence (not a wiki entry)",
          "The English and Chinese lore lines convey the same vibe",
          `The lore matches the intended vibe: ${evalCase.vibe}`,
          "The name is short, made-up, and trademark-clean (no Pokemon/Digimon/franchise references)",
          "The chosen type is one of leaf, ember, tide, dust, glow, frost, dawn, void",
        ],
      });

      expect(judgeResult.pass, `Judge failed: ${judgeResult.reasoning}`).toBe(
        true,
      );
    },
  );
});
