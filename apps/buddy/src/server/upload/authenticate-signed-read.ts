import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";
import { authenticateMachine } from "./authenticate-machine.ts";
import { MAX_CLOCK_SKEW_MS } from "./handle-upload.ts";
import {
  readReadHeaders,
  verifyReadSignature,
} from "./verify-upload-signature.ts";

export type SignedReadDeps = {
  kv: BuddyKv;
  secret: string;
  now: () => number;
};

/**
 * Checks a read of `user` that a connected Mac signed, and reads `extraKeys`
 * in the same MGET as the Mac's key. The values of `extraKeys` and the
 * machine, or null for any auth failure, which the caller answers with its
 * one 401. A request whose time is out of the clock-skew window costs no
 * Redis command.
 */
export async function authenticateSignedRead(
  request: Request,
  user: string,
  { kv, secret, now }: SignedReadDeps,
  extraKeys: readonly string[] = [],
) {
  const signed = readReadHeaders(request.headers);
  if (!signed || Math.abs(now() - signed.at) > MAX_CLOCK_SKEW_MS) return null;
  const { machine, signature, at } = signed;
  const [sealedKey, ...values] = await kv.getMany([
    buddyKeys.macKey(machine),
    ...extraKeys,
  ]);
  const key = authenticateMachine({ sealedKey, secret, machine, user });
  if (
    key === null ||
    !verifyReadSignature({
      user,
      machine,
      at,
      signature,
      publicKey: key.publicKey,
    })
  ) {
    return null;
  }
  return { machine, values };
}
