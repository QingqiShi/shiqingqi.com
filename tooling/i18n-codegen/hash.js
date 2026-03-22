import { createHash } from "node:crypto";

/**
 * Generate a deterministic content-hash key from a translation pair.
 * Hashing both languages means identical English with different Chinese
 * translations produce distinct keys (no conflicts), while identical
 * pairs naturally deduplicate.
 * Uses first 8 characters of SHA-256 hex digest.
 * @param {string} en - The English translation string
 * @param {string} zh - The Chinese translation string
 * @returns {string} 8-character hex hash key
 */
export function generateKey(en, zh) {
  return createHash("sha256")
    .update(en + "\0" + zh)
    .digest("hex")
    .slice(0, 8);
}
