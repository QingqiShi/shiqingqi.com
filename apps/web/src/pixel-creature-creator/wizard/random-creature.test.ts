import { describe, expect, it } from "vitest";
import { creatureDefSchema } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { randomCreature } from "./random-creature";

describe("randomCreature", () => {
  it("produces schema-valid defs across 1000 iterations", () => {
    for (let i = 0; i < 1000; i += 1) {
      const def = randomCreature();
      const result = creatureDefSchema.safeParse(def);
      if (!result.success) {
        throw new Error(
          `randomCreature produced invalid def at iteration ${String(i)}: ${result.error.message}`,
        );
      }
      expect(result.success).toBe(true);
    }
  });
});
