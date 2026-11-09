import type { PublicPetState } from "#src/pet/types.ts";
import { ACCOUNT_NAME_PATTERN } from "../account-name-pattern.ts";
import { careKeys, countersOf } from "../care/care-keys.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";
import { combineSnapshots, type MacsState } from "./combine-snapshots.ts";
import { parseSnapshot, type MacSnapshot } from "./parse-snapshot.ts";

type ReadOptions = {
  includePrivate?: boolean;
  excludeMachine?: string;
  withVisitors?: boolean;
};

/**
 * The state of the account `name`. A GET of the key that says the page is
 * public comes first; only a public page (or the owner's own read) then reads
 * the Macs and their snapshots. Null when no account has the name or when its
 * page is private, and both take the same single read, so that a private
 * account answers as a name that nobody has. `includePrivate` is for the
 * page's owner, whose account the caller knows exists. `excludeMachine`
 * leaves one Mac's snapshot out: what the account's other Macs add up to.
 * `withVisitors` also reads the page's care counts, in the MGET of the
 * snapshots.
 */
export async function readPetState(
  kv: BuddyKv,
  name: string,
  options: ReadOptions & { withVisitors: true },
): Promise<PublicPetState | null>;
export async function readPetState(
  kv: BuddyKv,
  name: string,
  options?: ReadOptions,
): Promise<MacsState | null>;
export async function readPetState(
  kv: BuddyKv,
  name: string,
  {
    includePrivate = false,
    excludeMachine,
    withVisitors = false,
  }: ReadOptions = {},
): Promise<MacsState | PublicPetState | null> {
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
  const extraKeys = withVisitors ? careKeys(name) : [];
  const keys = [...extraKeys, ...macs.map(buddyKeys.macSnapshot)];
  const values = keys.length === 0 ? [] : await kv.getMany(keys);
  const snapshots = values
    .slice(extraKeys.length)
    .map((value) => parseSnapshot(value))
    .filter((snapshot): snapshot is MacSnapshot => snapshot !== null);
  const state = combineSnapshots(name, snapshots);
  return withVisitors
    ? { ...state, visitors: countersOf(values.slice(0, extraKeys.length)) }
    : state;
}
