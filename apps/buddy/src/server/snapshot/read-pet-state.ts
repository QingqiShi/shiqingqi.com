import type { PublicPetState } from "#src/pet/types.ts";
import { ACCOUNT_NAME_PATTERN } from "../account-name-pattern.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";
import { combineSnapshots } from "./combine-snapshots.ts";
import { parseSnapshot, type MacSnapshot } from "./parse-snapshot.ts";

/**
 * The state of the account `name`. A GET of the key that says the page is
 * public comes first; only a public page (or the owner's own read) then reads
 * the Macs and their snapshots. Null when no account has the name or when its
 * page is private, and both take the same single read, so that a private
 * account answers as a name that nobody has. `includePrivate` is for the
 * page's owner, whose account the caller knows exists. `excludeMachine`
 * leaves one Mac's snapshot out: what the account's other Macs add up to.
 */
export async function readPetState(
  kv: BuddyKv,
  name: string,
  {
    includePrivate = false,
    excludeMachine,
  }: { includePrivate?: boolean; excludeMachine?: string } = {},
): Promise<PublicPetState | null> {
  if (!ACCOUNT_NAME_PATTERN.test(name)) return null;
  if (
    !includePrivate &&
    (await kv.get(buddyKeys.publicAccount(name))) === null
  ) {
    return null;
  }
  const macs = (await kv.setMembers(buddyKeys.accountMacs(name)))
    .filter((machine) => machine !== excludeMachine)
    .sort();
  const values =
    macs.length === 0 ? [] : await kv.getMany(macs.map(buddyKeys.macSnapshot));
  const snapshots = values
    .map((value) => parseSnapshot(value))
    .filter((snapshot): snapshot is MacSnapshot => snapshot !== null);
  return combineSnapshots(name, snapshots);
}
