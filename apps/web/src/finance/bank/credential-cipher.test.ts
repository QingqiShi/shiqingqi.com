import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { credentialCipher, readCredentialKey } from "./credential-cipher.ts";

const KEY = new Uint8Array(randomBytes(32));
const HOUSEHOLD = "00000000-0000-4000-8000-000000000001";

describe("credentialCipher", () => {
  it("opens what it sealed, and the sealed bytes do not hold the secret", () => {
    const sealed = credentialCipher.seal("lf-secret-key", KEY, HOUSEHOLD);

    expect(Buffer.from(sealed).toString("latin1")).not.toContain(
      "lf-secret-key",
    );
    expect(credentialCipher.open(sealed, KEY, HOUSEHOLD)).toBe("lf-secret-key");
  });

  it("seals the same secret differently each time", () => {
    const first = credentialCipher.seal("lf-secret-key", KEY, HOUSEHOLD);
    const second = credentialCipher.seal("lf-secret-key", KEY, HOUSEHOLD);

    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
  });

  it("refuses another key, another Household, or changed bytes", () => {
    const sealed = credentialCipher.seal("lf-secret-key", KEY, HOUSEHOLD);
    const changed = new Uint8Array(sealed);
    changed[changed.length - 1] ^= 1;

    expect(() =>
      credentialCipher.open(sealed, new Uint8Array(randomBytes(32)), HOUSEHOLD),
    ).toThrow();
    expect(() =>
      credentialCipher.open(
        sealed,
        KEY,
        "00000000-0000-4000-8000-000000000002",
      ),
    ).toThrow();
    expect(() => credentialCipher.open(changed, KEY, HOUSEHOLD)).toThrow();
  });
});

describe("readCredentialKey", () => {
  it("takes 32 bytes in base64 and nothing else", () => {
    expect(readCredentialKey(Buffer.from(KEY).toString("base64"))).toEqual(KEY);
    expect(readCredentialKey(undefined)).toBeNull();
    expect(readCredentialKey("")).toBeNull();
    expect(readCredentialKey(randomBytes(16).toString("base64"))).toBeNull();
  });
});
