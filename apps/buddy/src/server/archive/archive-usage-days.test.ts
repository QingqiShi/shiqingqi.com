import { generateKeyPairSync } from "node:crypto";
import { asc } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBuddyTestKit } from "#src/testing/create-buddy-test-kit.ts";
import { sampleUpload } from "#src/testing/sample-upload.ts";
import { buddyUsageDays } from "../db/schema.ts";
import { machineStore } from "../machines/machine-store.ts";
import { nextSnapshot } from "../snapshot/next-snapshot.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import { rawPublicKey } from "../upload/verify-upload-signature.ts";
import { archiveUsageDays, upsertUsageDays } from "./archive-usage-days.ts";

const day = {
  day: "2026-11-06",
  tokens: 1_000,
  costUsd: 1.5,
  cacheRead: null,
  promptTokens: 40,
};

describe("upsertUsageDays", () => {
  let kit: Awaited<ReturnType<typeof createBuddyTestKit>>;
  let row: typeof day & { userId: string; machineId: string };

  beforeAll(async () => {
    kit = await createBuddyTestKit();
    const userId = await kit.addAccount("qingqi");
    const { machineId } = await machineStore.connect(kit.db, {
      userId,
      publicKey: rawPublicKey(generateKeyPairSync("ed25519").publicKey),
      name: "MacBook Pro",
      now: new Date(kit.clock.now),
    });
    row = { ...day, userId, machineId };
  });

  afterAll(async () => {
    await kit.db.close();
  });

  it("keeps the larger value of every column across runs", async () => {
    await upsertUsageDays(kit.db, [
      row,
      { ...row, day: "2026-11-07", tokens: 5_000_000_000 },
    ]);
    await upsertUsageDays(kit.db, [
      { ...row, tokens: 900, costUsd: 2, cacheRead: 700, promptTokens: null },
    ]);

    const rows = await kit.db
      .select()
      .from(buddyUsageDays)
      .orderBy(asc(buddyUsageDays.day));
    expect(rows.map(({ archivedAt: _archivedAt, ...rest }) => rest)).toEqual([
      { ...row, tokens: 1_000, costUsd: 2, cacheRead: 700, promptTokens: 40 },
      { ...row, day: "2026-11-07", tokens: 5_000_000_000 },
    ]);
  });
});

describe("archiveUsageDays", () => {
  it("copies the days of every Mac the account ever connected", async () => {
    const kit = await createBuddyTestKit();
    try {
      const userId = await kit.addAccount("qingqi");
      const connect = (name: string) =>
        machineStore.connect(kit.db, {
          userId,
          publicKey: rawPublicKey(generateKeyPairSync("ed25519").publicKey),
          name,
          now: new Date(kit.clock.now),
        });
      const kept = await connect("MacBook Pro");
      const gone = await connect("Mac mini");
      await machineStore.revoke(kit.db, {
        userId,
        machineId: gone.machineId,
        now: new Date(kit.clock.now),
      });
      for (const [machineId, tokens] of [
        [kept.machineId, 100],
        [gone.machineId, 7],
      ] as const) {
        await kit.kv.set(
          buddyKeys.macSnapshot(machineId),
          JSON.stringify(
            nextSnapshot(
              null,
              sampleUpload({
                days: [{ day: "2026-11-07", tokens, costUsd: 1 }],
              }),
              kit.clock.now,
            ),
          ),
        );
      }

      expect(await archiveUsageDays(kit.kv, kit.db)).toBe(2);
      const rows = await kit.db
        .select({
          machineId: buddyUsageDays.machineId,
          tokens: buddyUsageDays.tokens,
        })
        .from(buddyUsageDays)
        .orderBy(asc(buddyUsageDays.tokens));
      expect(rows).toEqual([
        { machineId: gone.machineId, tokens: 7 },
        { machineId: kept.machineId, tokens: 100 },
      ]);
    } finally {
      await kit.db.close();
    }
  });
});
