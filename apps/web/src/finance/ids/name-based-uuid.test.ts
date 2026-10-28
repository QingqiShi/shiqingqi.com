import { describe, expect, it } from "vitest";
import { nameBasedUuid } from "./name-based-uuid.ts";

const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("nameBasedUuid", () => {
  it("matches a fixed vector", () => {
    expect(nameBasedUuid("www.example.com", DNS_NAMESPACE)).toBe(
      "5c146b14-3c52-8afd-938a-375d0df1fbf6",
    );
  });
});
