import { eq, isNotNull } from "drizzle-orm";
import { accounts, machines } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";
import { macKeySeal, type MacKey } from "./mac-key-seal.ts";

/**
 * The Redis copy of the accounts and their Macs, which the upload and the
 * public read use so that they never touch Postgres. Postgres stays the
 * truth: write Redis after each change there.
 */
export function makeMachineRegistry({
  kv,
  secret,
}: {
  kv: BuddyKv;
  secret: string;
}) {
  /** A private page has no key, so that its read is the read of a name that no account has. */
  async function setVisibility(account: {
    userId: string;
    name: string;
    isPublic: boolean;
  }) {
    if (account.isPublic) {
      await kv.set(buddyKeys.publicAccount(account.name), account.userId);
    } else {
      await kv.del(buddyKeys.publicAccount(account.name));
    }
  }

  async function connect(key: MacKey) {
    await Promise.all([
      kv.set(buddyKeys.macKey(key.machineId), macKeySeal.seal(key, secret)),
      kv.addToSet(buddyKeys.accountMacs(key.name), [key.machineId]),
    ]);
  }

  /**
   * A removed Mac's days stop counting. The Mac uploads its whole history
   * each time, so a Mac that connects again with a new machine id counts its
   * days once.
   */
  async function remove(mac: { machineId: string; name: string }) {
    await kv.del(buddyKeys.macKey(mac.machineId));
    await Promise.all([
      kv.removeFromSet(buddyKeys.accountMacs(mac.name), [mac.machineId]),
      kv.del(buddyKeys.macSnapshot(mac.machineId)),
    ]);
  }

  /**
   * Writes every account and Mac of Postgres again, so that a lost Redis
   * heals. It reads the removed Macs and the private accounts after it wrote
   * the connected Macs and the public accounts: a removal, or a page made
   * private, that ends while it runs then still removes its keys.
   */
  async function syncFrom(db: BuddyDb) {
    const rows = await db
      .select({
        userId: accounts.id,
        name: accounts.name,
        isPublic: accounts.isPublic,
        machineId: machines.machineId,
        publicKey: machines.publicKey,
        revokedAt: machines.revokedAt,
      })
      .from(accounts)
      .leftJoin(machines, eq(machines.userId, accounts.id));
    const macsByName = new Map<string, string[]>();
    const writes: Promise<unknown>[] = [];
    for (const row of rows) {
      const macs = macsByName.get(row.name) ?? [];
      if (!macsByName.has(row.name)) {
        macsByName.set(row.name, macs);
        if (row.isPublic) writes.push(setVisibility(row));
      }
      if (
        row.machineId === null ||
        row.publicKey === null ||
        row.revokedAt !== null
      ) {
        continue;
      }
      macs.push(row.machineId);
      writes.push(
        kv.set(
          buddyKeys.macKey(row.machineId),
          macKeySeal.seal(
            {
              machineId: row.machineId,
              userId: row.userId,
              name: row.name,
              publicKey: row.publicKey,
            },
            secret,
          ),
        ),
      );
    }
    for (const [name, macs] of macsByName) {
      writes.push(kv.addToSet(buddyKeys.accountMacs(name), macs));
    }
    await Promise.all(writes);

    const [removed, privateAccounts] = await Promise.all([
      db
        .select({ machineId: machines.machineId, name: accounts.name })
        .from(machines)
        .innerJoin(accounts, eq(accounts.id, machines.userId))
        .where(isNotNull(machines.revokedAt)),
      db
        .select({ userId: accounts.id, name: accounts.name })
        .from(accounts)
        .where(eq(accounts.isPublic, false)),
    ]);
    await Promise.all([
      kv.delMany([
        ...removed.flatMap((mac) => [
          buddyKeys.macKey(mac.machineId),
          buddyKeys.macSnapshot(mac.machineId),
        ]),
        ...privateAccounts.map((account) =>
          buddyKeys.publicAccount(account.name),
        ),
      ]),
      ...[...Map.groupBy(removed, (mac) => mac.name)].map(([name, macs]) =>
        kv.removeFromSet(
          buddyKeys.accountMacs(name),
          macs.map((mac) => mac.machineId),
        ),
      ),
    ]);
  }

  return { setVisibility, connect, remove, syncFrom };
}

export type MachineRegistry = ReturnType<typeof makeMachineRegistry>;
