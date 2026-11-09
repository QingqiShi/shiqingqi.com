import { createHash, timingSafeEqual } from "node:crypto";

export function constantTimeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB) && a.length === b.length;
}
