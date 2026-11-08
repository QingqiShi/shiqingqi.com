import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBuddyTestKit,
  TEST_SECRET,
} from "#src/testing/create-buddy-test-kit.ts";
import { sampleUpload } from "#src/testing/sample-upload.ts";
import { machineStore } from "../machines/machine-store.ts";
import { handleUpload } from "../upload/handle-upload.ts";
import {
  rawPublicKey,
  READ_HEADERS,
  readMessage,
  signUpload,
} from "../upload/verify-upload-signature.ts";
import { handleOthersRead } from "./handle-others-read.ts";

const USER = "qingqi";

type Kit = Awaited<ReturnType<typeof createBuddyTestKit>>;

let kit: Kit;
let userId: string;

async function connectMac(
  name: string,
  account: { userId: string; name: string } = { userId, name: USER },
) {
  const keys = generateKeyPairSync("ed25519");
  const publicKey = rawPublicKey(keys.publicKey);
  const { machineId } = await machineStore.connect(kit.db, {
    userId: account.userId,
    publicKey,
    name,
    now: new Date(kit.clock.now),
  });
  await kit.registry.connect({
    machineId,
    userId: account.userId,
    name: account.name,
    publicKey,
  });
  return { machine: machineId, privateKey: keys.privateKey };
}

type Mac = Awaited<ReturnType<typeof connectMac>>;

/** The headers of a signed read, as the Mac signs them. */
function signRead({
  user,
  machine,
  at,
  privateKey,
}: {
  user: string;
  machine: string;
  at: number;
  privateKey: KeyObject;
}): Record<string, string> {
  return {
    [READ_HEADERS.machine]: machine,
    [READ_HEADERS.at]: String(at),
    [READ_HEADERS.signature]: sign(
      null,
      readMessage({ user, machine, at }),
      privateKey,
    ).toString("base64"),
  };
}

async function uploadDays(mac: Mac, days: { day: string; tokens: number }[]) {
  const body = new TextEncoder().encode(
    JSON.stringify(
      sampleUpload({
        at: kit.clock.now,
        days: days.map((day) => ({ ...day, costUsd: 1 })),
      }),
    ),
  );
  const response = await handleUpload(
    new Request(`https://buddy.test/api/v1/u/${USER}/upload`, {
      method: "POST",
      headers: signUpload({ user: USER, ...mac, body }),
      body: Buffer.from(body),
    }),
    USER,
    { kv: kit.kv, secret: TEST_SECRET, now: () => kit.clock.now },
  );
  expect(response.status).toBe(200);
}

function read(
  mac: Mac,
  {
    at = kit.clock.now,
    headers = {},
  }: { at?: number; headers?: Record<string, string> } = {},
) {
  return handleOthersRead(
    new Request(`https://buddy.test/api/v1/u/${USER}/others`, {
      headers: { ...signRead({ user: USER, at, ...mac }), ...headers },
    }),
    USER,
    { kv: kit.kv, secret: TEST_SECRET, now: () => kit.clock.now },
  );
}

let connected: Mac;

beforeEach(async () => {
  kit = await createBuddyTestKit();
  userId = await kit.addAccount(USER, { isPublic: false });
  connected = await connectMac("laptop");
});

afterEach(async () => {
  await kit.db.close();
});

describe("handleOthersRead", () => {
  it("answers a connected Mac with the other Macs' days, also for a private page", async () => {
    const laptop = connected;
    const desk = await connectMac("desk");
    await uploadDays(laptop, [{ day: "2026-11-07", tokens: 100 }]);
    await uploadDays(desk, [
      { day: "2026-11-06", tokens: 30 },
      { day: "2026-11-07", tokens: 5 },
    ]);

    const response = await read(laptop);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      user: USER,
      days: [
        { day: "2026-11-06", tokens: 30 },
        { day: "2026-11-07", tokens: 5 },
      ],
    });
    expect(await (await read(desk)).json()).toMatchObject({
      days: [{ day: "2026-11-07", tokens: 100 }],
    });
  });

  it("answers an account with one Mac with no days", async () => {
    await uploadDays(connected, [{ day: "2026-11-07", tokens: 100 }]);
    expect(await (await read(connected)).json()).toMatchObject({
      user: USER,
      updatedAt: null,
      days: [],
    });
  });

  it.each([
    [
      "another key",
      () =>
        read({
          ...connected,
          privateKey: generateKeyPairSync("ed25519").privateKey,
        }),
    ],
    [
      "a Mac of another account",
      async () => {
        const otherName = "otheracc";
        const otherId = await kit.addAccount(otherName, { isPublic: true });
        return read(
          await connectMac("stranger", { userId: otherId, name: otherName }),
        );
      },
    ],
    [
      "a machine id that has no key",
      () => read({ ...connected, machine: "mac-unknown00" }),
    ],
    [
      "a time older than two minutes",
      () => read(connected, { at: kit.clock.now - 2 * 60_000 - 1 }),
    ],
    [
      "a time header that differs from the signed one",
      () =>
        read(connected, { headers: { "Buddy-At": String(kit.clock.now + 1) } }),
    ],
    ["no time header", () => read(connected, { headers: { "Buddy-At": "" } })],
  ])("refuses a read with %s", async (_name, request) => {
    expect((await request()).status).toBe(401);
  });
});
