import { describe, expect, it } from "vitest";

import { generateKey } from "./generate-key";

describe("generateKey", () => {
  it("returns the first eight hex characters of the pair's SHA-256", () => {
    expect(generateKey("Hello", "你好")).toBe("5adce93a");
  });

  it("produces the same key for the same input pair", () => {
    expect(generateKey("Hello", "你好")).toBe(generateKey("Hello", "你好"));
  });

  it("produces different keys for different English strings", () => {
    expect(generateKey("Hello", "你好")).not.toBe(generateKey("World", "世界"));
  });

  it("produces different keys for same English with different Chinese", () => {
    expect(generateKey("Save", "保存")).not.toBe(generateKey("Save", "存档"));
  });
});
