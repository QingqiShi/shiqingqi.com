import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBuddyTestKit,
  TEST_SECRET,
} from "#src/testing/create-buddy-test-kit.ts";
import { machineStore } from "../machines/machine-store.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";
import {
  rawPublicKey,
  READ_HEADERS,
  readMessage,
} from "../upload/verify-upload-signature.ts";
import { handleVisitorsRead } from "./handle-visitors-read.ts";

const USER = "qingqi";

type Kit = Awaited<ReturnType<typeof createBuddyTestKit>>;

let kit: Kit;
let mac: { machine: string; privateKey: KeyObject };

/** Spies on every method of the store, as each call is one Redis command. */
function countCommands(kv: BuddyKv) {
  const methods = [
    "get",
    "getMany",
    "set",
    "del",
    "delMany",
    "increment",
    "incrementBy",
    "addToSet",
    "removeFromSet",
    "setMembers",
  ] as const;
  const spies = methods.map((method) => vi.spyOn(kv, method));
  return () => spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0);
}

function read({
  at = kit.clock.now,
  privateKey = mac.privateKey,
  user = USER,
}: {
  at?: number;
  privateKey?: KeyObject;
  user?: string;
} = {}) {
  return handleVisitorsRead(
    new Request(`https://buddy.test/api/v1/u/${user}/visitors`, {
      headers: {
        [READ_HEADERS.machine]: mac.machine,
        [READ_HEADERS.at]: String(at),
        [READ_HEADERS.signature]: sign(
          null,
          readMessage({ user, machine: mac.machine, at }),
          privateKey,
        ).toString("base64"),
      },
    }),
    user,
    { kv: kit.kv, secret: TEST_SECRET, now: () => kit.clock.now },
  );
}

beforeEach(async () => {
  kit = await createBuddyTestKit();
  const userId = await kit.addAccount(USER, { isPublic: false });
  const keys = generateKeyPairSync("ed25519");
  const publicKey = rawPublicKey(keys.publicKey);
  const { machineId } = await machineStore.connect(kit.db, {
    userId,
    publicKey,
    name: "laptop",
    now: new Date(kit.clock.now),
  });
  await kit.registry.connect({ machineId, userId, name: USER, publicKey });
  mac = { machine: machineId, privateKey: keys.privateKey };
});

afterEach(async () => {
  await kit.db.close();
});

describe("handleVisitorsRead", () => {
  it("answers a connected Mac with the visitors' counts in one Redis command, also for a private page", async () => {
    await kit.kv.incrementBy([
      [buddyKeys.careFed(USER), 4],
      [buddyKeys.carePatted(USER), 9],
    ]);
    const commands = countCommands(kit.kv);
    const response = await read();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      visitors: { fed: 4, patted: 9 },
    });
    expect(commands()).toBe(1);
  });

  it.each([
    [
      "another key",
      () => read({ privateKey: generateKeyPairSync("ed25519").privateKey }),
    ],
    ["another account's name", () => read({ user: "otheracc" })],
    [
      "a time older than two minutes",
      () => read({ at: kit.clock.now - 120_001 }),
    ],
  ])("refuses a read with %s", async (_name, request) => {
    const response = await request();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });
});
