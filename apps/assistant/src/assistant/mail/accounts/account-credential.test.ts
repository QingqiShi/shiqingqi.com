import { randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { accountCredential } from "#src/assistant/mail/accounts/account-credential.ts";
import { readCredentialKey } from "./credential-cipher.ts";

const KEY = new Uint8Array(randomBytes(32));
const owner = { userId: randomUUID(), accountId: randomUUID() };
const credential = {
  type: "password",
  password: "abcd-efgh-ijkl-mnop",
} as const;

describe("account credentials", () => {
  it("open for their own account, and the sealed bytes do not hold the secret", () => {
    const sealed = accountCredential.seal(credential, KEY, owner);

    expect(Buffer.from(sealed).toString("latin1")).not.toContain(
      credential.password,
    );
    expect(accountCredential.open(sealed, KEY, owner)).toEqual(credential);
  });

  it("do not open for another account, another user, another key, or changed bytes", () => {
    const sealed = accountCredential.seal(credential, KEY, owner);
    const changed = new Uint8Array(sealed);
    changed[changed.length - 1] ^= 1;

    expect(
      accountCredential.open(sealed, KEY, {
        ...owner,
        accountId: randomUUID(),
      }),
    ).toBeNull();
    expect(
      accountCredential.open(sealed, KEY, { ...owner, userId: randomUUID() }),
    ).toBeNull();
    expect(
      accountCredential.open(sealed, new Uint8Array(randomBytes(32)), owner),
    ).toBeNull();
    expect(accountCredential.open(changed, KEY, owner)).toBeNull();
  });
});

describe("readCredentialKey", () => {
  it("takes 32 bytes in base64 and nothing else", () => {
    expect(readCredentialKey(Buffer.from(KEY).toString("base64"))).toEqual(KEY);
    expect(readCredentialKey(undefined)).toBeNull();
    expect(readCredentialKey(randomBytes(16).toString("base64"))).toBeNull();
  });
});
