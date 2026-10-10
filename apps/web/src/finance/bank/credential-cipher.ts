import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * The key that seals each Connection's credential: `FINANCE_CREDENTIAL_KEY`,
 * 32 random bytes in base64. Null when it is unset or not 32 bytes.
 */
export function readCredentialKey(
  encoded: string | undefined,
): Uint8Array | null {
  if (!encoded) return null;
  const key = Buffer.from(encoded, "base64");
  return key.length === KEY_BYTES ? new Uint8Array(key) : null;
}

/**
 * AES-256-GCM, stored as IV, then tag, then ciphertext. The Household id is
 * the associated data, so a sealed credential opens only for its own
 * Household.
 */
export const credentialCipher = {
  seal(secret: string, key: Uint8Array, householdId: string): Uint8Array {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(householdId));
    const ciphertext = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);
    return new Uint8Array(Buffer.concat([iv, cipher.getAuthTag(), ciphertext]));
  },

  /** Throws when the key, the Household or the sealed bytes do not match. */
  open(sealed: Uint8Array, key: Uint8Array, householdId: string): string {
    const bytes = Buffer.from(sealed);
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      bytes.subarray(0, IV_BYTES),
    );
    decipher.setAAD(Buffer.from(householdId));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([
      decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString("utf8");
  },
};
