import { describe, expect, it } from "vitest";
import { EFFECT_ROLES } from "./effect-roles.ts";
import { effectsForRoles } from "./effects-for-roles.ts";

describe("effectsForRoles", () => {
  it.each(EFFECT_ROLES.map((role, bit) => [role, bit] as const))(
    "has an effect for %s",
    (_, bit) => {
      expect(effectsForRoles(1 << bit)).toHaveLength(1);
    },
  );

  it("runs nothing without a role", () => {
    expect(effectsForRoles(0)).toEqual([]);
  });
});
