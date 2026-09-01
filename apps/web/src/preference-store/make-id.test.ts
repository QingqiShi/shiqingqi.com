import { describe, expect, it } from "vitest";
import { makeId } from "./make-id";

describe("makeId", () => {
  it("creates composite key from category and lowercase value", () => {
    expect(makeId("genre", "Sci-Fi")).toBe("genre:sci-fi");
  });

  it("handles already-lowercase values", () => {
    expect(makeId("actor", "keanu reeves")).toBe("actor:keanu reeves");
  });

  it("produces the same key for different casings", () => {
    expect(makeId("director", "Christopher Nolan")).toBe(
      makeId("director", "christopher nolan"),
    );
  });
});
