import { describe, expect, it } from "vitest";
import { border, color, font, space } from "../tokens.stylex.ts";
import {
  editableTokens,
  findEditableToken,
  SKIPPED,
  type TokenGroup,
  unclassifiedTokens,
} from "./token-registry.ts";

// `object` (not Record<string,string>) because the VarGroup type has no string
// index signature; read members via Reflect.get + Object.keys instead.
const liveGroups: Record<TokenGroup, object> = { color, font, space, border };
const groupNames: readonly TokenGroup[] = ["color", "font", "space", "border"];

describe("token registry", () => {
  it("registers at least the core token surfaces", () => {
    expect(editableTokens.length).toBeGreaterThan(50);
  });

  it("has no unclassified tokens (anti-drift guard)", () => {
    // If this fails, a token was added to tokens.stylex.ts that the registry
    // doesn't know how to edit. Classify it in token-registry.ts or add it to
    // SKIPPED with a reason.
    expect(unclassifiedTokens).toEqual([]);
  });

  it("covers every non-skipped member of each group exactly once", () => {
    for (const groupName of groupNames) {
      const skipped = SKIPPED[groupName];
      const expected = Object.keys(liveGroups[groupName])
        .filter((member) => !member.startsWith("__") && !skipped.has(member))
        .sort();
      const registered = editableTokens
        .filter((entry) => entry.group === groupName)
        .map((entry) => entry.member)
        .sort();
      expect(registered).toEqual(expected);
    }
  });

  it("uses unique paths", () => {
    const paths = editableTokens.map((entry) => entry.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every entry resolves to the live token's var() reference", () => {
    for (const entry of editableTokens) {
      expect(Reflect.get(liveGroups[entry.group], entry.member)).toBe(
        entry.ref,
      );
      expect(entry.ref).toMatch(/^var\(--.+\)$/);
    }
  });

  it("marks only color tokens as themed", () => {
    for (const entry of editableTokens) {
      expect(entry.themed).toBe(entry.kind === "color");
    }
  });

  describe("findEditableToken", () => {
    it("resolves an editable path to its entry", () => {
      const entry = findEditableToken("color.textMain");
      expect(entry?.path).toBe("color.textMain");
      expect(entry?.kind).toBe("color");
    });

    it("returns undefined for a non-editable token (no shadow group)", () => {
      expect(findEditableToken("shadow._1")).toBeUndefined();
    });

    it("returns undefined for a skipped member", () => {
      expect(findEditableToken("font.family")).toBeUndefined();
    });
  });
});
