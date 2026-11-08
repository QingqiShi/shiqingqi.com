import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";
import { parseSnapshot, type MacSnapshot } from "./parse-snapshot.ts";

/** The snapshots of these Macs, in one MGET. A Mac without one is not in the map. */
export async function readSnapshots(
  kv: BuddyKv,
  machineIds: readonly string[],
): Promise<Map<string, MacSnapshot>> {
  const values = await kv.getMany(machineIds.map(buddyKeys.macSnapshot));
  const snapshots = new Map<string, MacSnapshot>();
  for (const [index, machineId] of machineIds.entries()) {
    const snapshot = parseSnapshot(values[index] ?? null);
    if (snapshot) snapshots.set(machineId, snapshot);
  }
  return snapshots;
}
