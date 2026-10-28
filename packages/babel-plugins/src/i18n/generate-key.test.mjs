import { describe, expect, it } from "vitest";

import { generateKey } from "./generate-key";

describe("generateKey", () => {
  it("returns the first eight hex characters of the pair's SHA-256", () => {
    expect(generateKey("Hello", "你好")).toBe("5adce93a");
  });

  it("produces different keys for same English with different Chinese", () => {
    expect(generateKey("Save", "保存")).not.toBe(generateKey("Save", "存档"));
  });
});
