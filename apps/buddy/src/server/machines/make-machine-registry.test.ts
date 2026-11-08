import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createBuddyTestKit,
  TEST_SECRET,
} from "#src/testing/create-buddy-test-kit.ts";
import { sampleUpload } from "#src/testing/sample-upload.ts";
import { readPetState } from "../snapshot/read-pet-state.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import { MemoryBuddyKv } from "../store/memory-buddy-kv.ts";
import { handleUpload } from "../upload/handle-upload.ts";
import { rawPublicKey, signUpload } from "../upload/verify-upload-signature.ts";
import { machineStore } from "./machine-store.ts";
import { makeMachineRegistry } from "./make-machine-registry.ts";

describe("syncFrom", () => {
  it("heals a lost Redis from Postgres, without the key of a removed Mac", async () => {
    const kit = await createBuddyTestKit();
    try {
      const userId = await kit.addAccount("qingqi");
      const connect = async () => {
        const key = generateKeyPairSync("ed25519");
        const { machineId } = await machineStore.connect(kit.db, {
          userId,
          publicKey: rawPublicKey(key.publicKey),
          name: "Mac",
          now: new Date(kit.clock.now),
        });
        return { machineId, privateKey: key.privateKey };
      };
      const kept = await connect();
      const gone = await connect();
      await machineStore.revoke(kit.db, {
        userId,
        machineId: gone.machineId,
        now: new Date(kit.clock.now),
      });

      const kv = new MemoryBuddyKv(() => kit.clock.now);
      await makeMachineRegistry({ kv, secret: TEST_SECRET }).syncFrom(kit.db);

      const upload = (mac: typeof kept) => {
        const body = new TextEncoder().encode(
          JSON.stringify(sampleUpload({ at: kit.clock.now })),
        );
        return handleUpload(
          new Request("https://buddy.test/api/v1/u/qingqi/upload", {
            method: "POST",
            headers: signUpload({
              user: "qingqi",
              machine: mac.machineId,
              privateKey: mac.privateKey,
              body,
            }),
            body: Buffer.from(body),
          }),
          "qingqi",
          { kv, secret: TEST_SECRET, now: () => kit.clock.now },
        );
      };
      expect((await upload(kept)).status).toBe(200);
      expect((await upload(gone)).status).toBe(401);
      expect(await readPetState(kv, "qingqi")).not.toBeNull();
    } finally {
      await kit.db.close();
    }
  });

  it("drops the days of a removed Mac that Redis still has", async () => {
    const kit = await createBuddyTestKit();
    try {
      const userId = await kit.addAccount("qingqi");
      const uploadFromNewMac = async () => {
        const key = generateKeyPairSync("ed25519");
        const publicKey = rawPublicKey(key.publicKey);
        const { machineId } = await machineStore.connect(kit.db, {
          userId,
          publicKey,
          name: "Mac",
          now: new Date(kit.clock.now),
        });
        await kit.registry.connect({
          machineId,
          userId,
          name: "qingqi",
          publicKey,
        });
        const body = new TextEncoder().encode(
          JSON.stringify(
            sampleUpload({
              at: kit.clock.now,
              days: [{ day: "2026-11-07", tokens: 100, costUsd: 1 }],
            }),
          ),
        );
        const response = await handleUpload(
          new Request("https://buddy.test/api/v1/u/qingqi/upload", {
            method: "POST",
            headers: signUpload({
              user: "qingqi",
              machine: machineId,
              privateKey: key.privateKey,
              body,
            }),
            body: Buffer.from(body),
          }),
          "qingqi",
          { kv: kit.kv, secret: TEST_SECRET, now: () => kit.clock.now },
        );
        expect(response.status).toBe(200);
        return machineId;
      };
      await uploadFromNewMac();
      const gone = await uploadFromNewMac();
      await machineStore.revoke(kit.db, {
        userId,
        machineId: gone,
        now: new Date(kit.clock.now),
      });

      await kit.registry.syncFrom(kit.db);

      expect((await readPetState(kit.kv, "qingqi"))?.days).toEqual([
        { day: "2026-11-07", tokens: 100, costUsd: 1 },
      ]);
      expect(await kit.kv.get(buddyKeys.macSnapshot(gone))).toBeNull();
    } finally {
      await kit.db.close();
    }
  });

  it("removes a public key that Redis still has for a private page", async () => {
    const kit = await createBuddyTestKit();
    try {
      await kit.addAccount("hidden", { isPublic: false });
      await kit.addAccount("shown");
      await kit.kv.set(buddyKeys.publicAccount("hidden"), "stale");

      await kit.registry.syncFrom(kit.db);

      expect(await readPetState(kit.kv, "hidden")).toBeNull();
      expect(await readPetState(kit.kv, "shown")).not.toBeNull();
    } finally {
      await kit.db.close();
    }
  });
});
