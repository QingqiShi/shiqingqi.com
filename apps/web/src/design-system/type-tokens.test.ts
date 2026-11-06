import { describe, expect, it } from "vitest";
import { typeTokens } from "./type-tokens.ts";

describe("typeTokens", () => {
  it("gives the type back when its runs are joined", () => {
    const type =
      'StyleXStyles< Pick< CSSProperties, | "inlineSize" | "gridArea" > >';
    expect(
      typeTokens(type)
        .map(([, text]) => text)
        .join(""),
    ).toBe(type);
  });

  it("tells literals, keywords, type names and labels apart", () => {
    expect(
      typeTokens('(next: TValue) => void | "md" | 3 | null').filter(
        ([kind]) => kind !== "space",
      ),
    ).toEqual([
      ["punct", "("],
      ["label", "next"],
      ["punct", ":"],
      ["type", "TValue"],
      ["punct", ")"],
      ["punct", "=>"],
      ["keyword", "void"],
      ["punct", "|"],
      ["string", '"md"'],
      ["punct", "|"],
      ["number", "3"],
      ["punct", "|"],
      ["keyword", "null"],
    ]);
  });
});
