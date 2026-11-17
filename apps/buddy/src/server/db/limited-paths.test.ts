import { generateKeyPairSync } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createBuddyTestKit } from "#src/testing/create-buddy-test-kit.ts";
import { sampleUpload } from "#src/testing/sample-upload.ts";
import { ownAccount, setOwnVisibility } from "../account/own-account.ts";
import { archiveCareCounts } from "../archive/archive-care-counts.ts";
import { archiveUsageDays } from "../archive/archive-usage-days.ts";
import { machineStore } from "../machines/machine-store.ts";
import { nextSnapshot } from "../snapshot/next-snapshot.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import { rawPublicKey } from "../upload/verify-upload-signature.ts";

let kit: Awaited<ReturnType<typeof createBuddyTestKit>>;
let mara: string;

// The stores run here as a role that no policy names, so a query that does
// not go through `buddy_app` or `buddy_archive` gets no row and changes none.
beforeAll(async () => {
  kit = await createBuddyTestKit();
  mara = await kit.addAccount("mara0001");
  await kit.addAccount("noor0001");
  for (const statement of [
    sql`create role outsider nobypassrls`,
    sql`grant all on all tables in schema public to outsider`,
    // A member that inherits a role also gets the policies of that role.
    sql`grant buddy_app, buddy_archive to outsider with inherit false`,
    sql`set session authorization outsider`,
  ]) {
    await kit.db.execute(statement);
  }
});

afterAll(() => kit.db.close());

it("runs every store of a signed-in user through row-level security", async () => {
  const now = new Date(kit.clock.now);
  expect(await ownAccount(kit.db, mara)).toEqual({
    name: "mara0001",
    isPublic: true,
  });
  expect(
    await setOwnVisibility(kit.db, {
      userId: mara,
      isPublic: false,
      whileLocked: () => Promise.resolve(),
    }),
  ).toEqual({ name: "mara0001", isPublic: false });

  const { machineId } = await machineStore.connect(kit.db, {
    userId: mara,
    publicKey: rawPublicKey(generateKeyPairSync("ed25519").publicKey),
    name: "MacBook Pro",
    now,
  });
  expect(await machineStore.list(kit.db, mara)).toMatchObject([
    { machineId, name: "MacBook Pro" },
  ]);
  expect(
    await machineStore.revoke(kit.db, { userId: mara, machineId, now }),
  ).toBe(true);
});

it("runs the daily archive through its own role", async () => {
  const now = new Date(kit.clock.now);
  const { machineId } = await machineStore.connect(kit.db, {
    userId: mara,
    publicKey: rawPublicKey(generateKeyPairSync("ed25519").publicKey),
    name: "Mac mini",
    now,
  });
  await kit.kv.set(
    buddyKeys.macSnapshot(machineId),
    JSON.stringify(
      nextSnapshot(
        null,
        sampleUpload({ days: [{ day: "2026-11-07", tokens: 5, costUsd: 1 }] }),
        kit.clock.now,
      ),
    ),
  );
  await kit.kv.incrementBy([[buddyKeys.careFed("mara0001"), 4]]);

  expect(await archiveUsageDays(kit.kv, kit.db)).toBe(1);
  await archiveCareCounts(kit.kv, kit.db);
  await kit.kv.delMany([buddyKeys.careFed("mara0001")]);
  await archiveCareCounts(kit.kv, kit.db);
  expect(await kit.kv.get(buddyKeys.careFed("mara0001"))).toBe("4");

  await kit.kv.delMany([buddyKeys.macKey(machineId)]);
  await kit.registry.syncFrom(kit.db);
  expect(await kit.kv.get(buddyKeys.macKey(machineId))).not.toBeNull();
});
