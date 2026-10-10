import { describe, expect, it } from "vitest";
import {
  categoryDisplayName,
  categoryLineName,
} from "./category-display-name.ts";

const names = { uncategorised: "未分类" };

describe("categoryDisplayName", () => {
  it("translates a system Category and keeps a Household's own name", () => {
    expect(
      categoryDisplayName({ name: "Uncategorised", isSystem: true }, names),
    ).toBe("未分类");
    expect(categoryDisplayName({ name: "超市", isSystem: false }, names)).toBe(
      "超市",
    );
  });
});

describe("categoryLineName", () => {
  it("names a line with no Category or on a system Category as Uncategorised", () => {
    expect(
      categoryLineName({ id: null, name: "", isSystem: false }, names),
    ).toBe("未分类");
    expect(
      categoryLineName(
        { id: "uncategorised", name: "Uncategorised", isSystem: true },
        names,
      ),
    ).toBe("未分类");
    expect(
      categoryLineName({ id: "food", name: "超市", isSystem: false }, names),
    ).toBe("超市");
  });
});
