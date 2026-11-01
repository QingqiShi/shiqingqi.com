import { createHash, randomBytes } from "node:crypto";

/** A PKCE verifier and the S256 challenge of it. */
export function createPkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
