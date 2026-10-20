import { describe, expect, it } from "vitest";
import { nameBasedUuid } from "./name-based-uuid.ts";

const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("nameBasedUuid", () => {
  it("matches a fixed vector", () => {
    expect(nameBasedUuid("www.example.com", DNS_NAMESPACE)).toBe(
      "5c146b14-3c52-8afd-938a-375d0df1fbf6",
    );
  });

  it("sets the version 8 and RFC variant bits", () => {
    for (const name of ["a", "b", "rule:2026-10-01", "bank:1:2"]) {
      expect(nameBasedUuid(name)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it("gives different ids for different namespaces", () => {
    expect(nameBasedUuid("name", DNS_NAMESPACE)).not.toBe(
      nameBasedUuid("name"),
    );
  });
});
