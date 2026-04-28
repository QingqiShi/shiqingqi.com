// @ts-check

const { createHash } = require("node:crypto");

/**
 * Generate a deterministic content-hash key from a translation pair.
 * Hashing both languages means identical English with different Chinese
 * translations produce distinct keys (no conflicts), while identical
 * pairs naturally deduplicate.
 * Uses first 8 characters of SHA-256 hex digest.
 * This is intentionally duplicated from packages/i18n-codegen/hash.js to avoid
 * ESM/CJS interop issues. A parity test ensures they stay in sync.
 * @param {string} en
 * @param {string} zh
 * @returns {string}
 */
function generateKey(en, zh) {
  return createHash("sha256")
    .update(en + "\0" + zh)
    .digest("hex")
    .slice(0, 8);
}

module.exports = { generateKey };
