import { macKeySeal, type MacKey } from "../machines/mac-key-seal.ts";

/**
 * The key of a Mac that may act for `user`: one that `secret` sealed for this
 * machine and that belongs to `user`. Null for any other case, which the
 * caller answers with its one 401.
 */
export function authenticateMachine({
  sealedKey,
  secret,
  machine,
  user,
}: {
  sealedKey: string | null | undefined;
  secret: string;
  machine: string;
  user: string;
}): MacKey | null {
  if (sealedKey === null || sealedKey === undefined) return null;
  const key = macKeySeal.open(sealedKey, machine, secret);
  return key?.name === user ? key : null;
}
