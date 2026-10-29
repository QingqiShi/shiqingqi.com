import { createHash } from "node:crypto";
import { uuidToBytes } from "./uuid-to-bytes.ts";

/** The namespace for every id Finance derives from a name, such as a Rule occurrence. */
const FINANCE_ID_NAMESPACE = "6f1e8f0a-3c2b-5d4e-9a7b-1c2d3e4f5a6b";

/** An RFC 9562 version 8 UUID built like version 5, but with SHA-256: the same name in the same namespace always gives the same id. */
export function nameBasedUuid(
  name: string,
  namespace = FINANCE_ID_NAMESPACE,
): string {
  const hash = createHash("sha256")
    .update(uuidToBytes(namespace))
    .update(name, "utf8")
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x80;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
