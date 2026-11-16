import { createHash, timingSafeEqual } from "node:crypto";

/** The hash is bound to the id of the code, so that it does not match the same digits of another code. */
export function hashEmailCode(codeId: string, code: string): Buffer {
  return createHash("sha256").update(`${codeId}:${code}`).digest();
}

export function isEmailCode(
  codeId: string,
  code: string,
  codeHash: Uint8Array,
): boolean {
  return timingSafeEqual(hashEmailCode(codeId, code), Buffer.from(codeHash));
}
