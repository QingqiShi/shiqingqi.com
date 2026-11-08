import { z } from "zod";
import { ACCOUNT_NAME_PATTERN } from "../account-name-pattern.ts";
import { makeSeal } from "../auth/make-seal.ts";

const macKeySchema = z.strictObject({
  machineId: z.string(),
  userId: z.uuid(),
  name: z.string().regex(ACCOUNT_NAME_PATTERN),
  publicKey: z.string(),
});

/** What the upload check knows of a connected Mac: its account and its Ed25519 public key. */
export type MacKey = z.infer<typeof macKeySchema>;

const seal = makeSeal({ purpose: "buddy-mac-key-v1", schema: macKeySchema });

/** The HMAC of a Mac key in Redis, so that a write to Redis alone cannot connect a Mac. */
export const macKeySeal = {
  seal: (key: MacKey, secret: string): string => seal.seal(key, secret),

  /** The key, when `value` was sealed with `secret` for this machine. */
  open(value: string, machineId: string, secret: string): MacKey | null {
    const key = seal.open(value, secret);
    return key?.machineId === machineId ? key : null;
  },
};
