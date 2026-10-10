import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { nameBasedUuid } from "./name-based-uuid.ts";

const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("nameBasedUuid", () => {
  it("hashes the namespace bytes and the name with SHA-256", () => {
    const hex = createHash("sha256")
      .update(Buffer.from(DNS_NAMESPACE.replaceAll("-", ""), "hex"))
      .update("www.example.com", "utf8")
      .digest("hex");
    const expected = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      `8${hex.slice(13, 16)}`,
      ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
        .toString(16)
        .padStart(2, "0") + hex.slice(18, 20),
      hex.slice(20, 32),
    ].join("-");
    expect(nameBasedUuid("www.example.com", DNS_NAMESPACE)).toBe(expected);
  });

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

  it("is accepted by a zod uuid", () => {
    expect(z.uuid().safeParse(nameBasedUuid("rule:2026-10-01")).success).toBe(
      true,
    );
  });

  it("gives the same id for the same name", () => {
    expect(nameBasedUuid("rule:2026-10-01")).toBe(
      nameBasedUuid("rule:2026-10-01"),
    );
  });

  it("gives different ids for different names", () => {
    expect(nameBasedUuid("rule:2026-10-01")).not.toBe(
      nameBasedUuid("rule:2026-10-02"),
    );
  });

  it("gives different ids for different namespaces", () => {
    expect(nameBasedUuid("name", DNS_NAMESPACE)).not.toBe(
      nameBasedUuid("name"),
    );
  });
});
