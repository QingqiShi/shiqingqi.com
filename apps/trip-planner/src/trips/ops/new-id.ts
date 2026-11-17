const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * A new id for a thing in a trip: 12 random letters and digits. It works in
 * the browser on a plain `http` address too, where `crypto.randomUUID` is
 * missing.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
