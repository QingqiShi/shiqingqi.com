import { describe, expect, it } from "vitest";
import { toURLSearchParams } from "./to-url-search-params";

describe("toURLSearchParams", () => {
  it("appends a string value", () => {
    expect(toURLSearchParams({ type: "tv" }).toString()).toBe("type=tv");
  });

  it("appends every array entry under the same key", () => {
    expect(toURLSearchParams({ genre: ["28", "12"] }).toString()).toBe(
      "genre=28&genre=12",
    );
  });

  it("skips undefined values", () => {
    expect(
      toURLSearchParams({
        type: undefined,
        sort: "popularity.desc",
      }).toString(),
    ).toBe("sort=popularity.desc");
  });
});
