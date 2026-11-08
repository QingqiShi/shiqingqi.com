import { generateKeyPairSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBuddyTestKit,
  TEST_SECRET,
} from "#src/testing/create-buddy-test-kit.ts";
import { sampleUpload } from "#src/testing/sample-upload.ts";
import { machines } from "../db/schema.ts";
import { makeMachineHandlers } from "../machines/make-machine-handlers.ts";
import { readPetState } from "../snapshot/read-pet-state.ts";
import { handleUpload } from "../upload/handle-upload.ts";
import { rawPublicKey, signUpload } from "../upload/verify-upload-signature.ts";
import { makeConnectHandlers } from "./make-connect-handlers.ts";

const ORIGIN = "https://buddy.test";

interface PollBody {
  status: string;
  user?: string;
  machine?: { id: string; name: string };
}

type Kit = Awaited<ReturnType<typeof createBuddyTestKit>>;

let kit: Kit;
let ownerId: string;

function handlers() {
  return makeConnectHandlers({
    kv: kit.kv,
    getDb: () => kit.db,
    registry: kit.registry,
    now: () => new Date(kit.clock.now),
    clientIp: () => "203.0.113.7",
  });
}

function newMac() {
  return generateKeyPairSync("ed25519");
}

async function start(mac = newMac(), name = "MacBook Pro") {
  const response = await handlers().start(
    new Request(`${ORIGIN}/api/v1/connect`, {
      method: "POST",
      body: JSON.stringify({ publicKey: rawPublicKey(mac.publicKey), name }),
    }),
  );
  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    requestId: string;
    code: string;
    url: string;
  };
  return { mac, ...body };
}

async function poll(requestId: string) {
  const response = await handlers().poll(
    new Request(`${ORIGIN}/api/v1/connect/${requestId}`),
    requestId,
  );
  return {
    status: response.status,
    body: (await response.json()) as PollBody,
  };
}

async function decide(
  code: string,
  decision: "approve" | "deny",
  { cookie, origin = ORIGIN }: { cookie?: string; origin?: string } = {},
) {
  const headers = new Headers({ Origin: origin });
  if (cookie) headers.set("Cookie", cookie);
  const response = await handlers().decide(
    new Request(`${ORIGIN}/api/connect/decide`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code, decision }),
    }),
  );
  return { status: response.status, body: (await response.json()) as object };
}

async function upload(
  user: string,
  machine: string,
  privateKey: ReturnType<typeof newMac>["privateKey"],
) {
  const body = new TextEncoder().encode(
    JSON.stringify(
      sampleUpload({
        at: kit.clock.now,
        days: [{ day: "2026-11-07", tokens: 100, costUsd: 1 }],
      }),
    ),
  );
  const headers = signUpload({ user, machine, privateKey, body });
  const response = await handleUpload(
    new Request(`${ORIGIN}/api/v1/u/${user}/upload`, {
      method: "POST",
      headers,
      body: Buffer.from(body),
    }),
    user,
    { kv: kit.kv, secret: TEST_SECRET, now: () => kit.clock.now },
  );
  return response.status;
}

beforeEach(async () => {
  kit = await createBuddyTestKit();
  ownerId = await kit.addAccount("qingqi");
});

afterEach(async () => {
  await kit.db.close();
});

describe("the connect flow", () => {
  it("connects the Mac on approval, and its uploads count from then on", async () => {
    const { mac, requestId, code, url } = await start();
    expect(url).toBe(`${ORIGIN}/connect?code=${code}`);
    expect(await poll(requestId)).toEqual({
      status: 200,
      body: { status: "pending" },
    });

    const approval = await decide(code, "approve", {
      cookie: await kit.sessionCookie(ownerId),
    });
    expect(approval.status).toBe(200);

    const answer = await poll(requestId);
    expect(answer.body).toMatchObject({
      status: "approved",
      user: "qingqi",
      machine: { name: "MacBook Pro" },
    });
    const machineId = answer.body.machine?.id ?? "";
    expect(await upload("qingqi", machineId, mac.privateKey)).toBe(200);
    expect((await readPetState(kit.kv, "qingqi"))?.days).toHaveLength(1);
  });

  it("counts a Mac that connects again once, and a removed Mac's days no longer", async () => {
    const cookie = await kit.sessionCookie(ownerId);
    const connect = async (mac = newMac()) => {
      const { requestId, code } = await start(mac);
      await decide(code, "approve", { cookie });
      return { mac, machineId: (await poll(requestId)).body.machine?.id ?? "" };
    };
    const tokens = async () =>
      (await readPetState(kit.kv, "qingqi"))?.days.reduce(
        (sum, day) => sum + day.tokens,
        0,
      );
    const remove = (machineId: string) =>
      makeMachineHandlers({
        getDb: () => kit.db,
        registry: kit.registry,
        now: () => new Date(kit.clock.now),
      }).remove(
        new Request(`${ORIGIN}/api/machines/remove`, {
          method: "POST",
          headers: { Origin: ORIGIN, Cookie: cookie },
          body: JSON.stringify({ machineId }),
        }),
      );

    const first = await connect();
    expect(await upload("qingqi", first.machineId, first.mac.privateKey)).toBe(
      200,
    );
    kit.clock.now += 60_000;
    const again = await connect(first.mac);
    expect(again.machineId).toBe(first.machineId);
    expect(await upload("qingqi", again.machineId, first.mac.privateKey)).toBe(
      200,
    );
    expect(await tokens()).toBe(100);

    expect((await remove(first.machineId)).status).toBe(200);
    kit.clock.now += 60_000;
    expect(await upload("qingqi", first.machineId, first.mac.privateKey)).toBe(
      401,
    );
    expect(await tokens()).toBe(0);

    const back = await connect(first.mac);
    expect(back.machineId).not.toBe(first.machineId);
    expect(await upload("qingqi", back.machineId, first.mac.privateKey)).toBe(
      200,
    );
    expect(await tokens()).toBe(100);
  });

  it("connects nothing when the owner cancels", async () => {
    const { requestId, code } = await start();
    expect(
      (await decide(code, "deny", { cookie: await kit.sessionCookie(ownerId) }))
        .status,
    ).toBe(200);
    expect((await poll(requestId)).body).toEqual({ status: "denied" });
    expect(await kit.db.$count(machines)).toBe(0);
  });

  it("expires a request that nobody answered in ten minutes", async () => {
    const { requestId, code } = await start();
    kit.clock.now += 10 * 60 * 1000 + 1;
    expect((await poll(requestId)).body).toEqual({ status: "expired" });
    expect(
      await decide(code, "approve", {
        cookie: await kit.sessionCookie(ownerId),
      }),
    ).toMatchObject({ status: 404 });
    expect(await kit.db.$count(machines)).toBe(0);
  });

  it("needs a signed-in owner on this origin to decide", async () => {
    const { requestId, code } = await start();
    expect(await decide(code, "approve")).toMatchObject({ status: 401 });
    expect(
      await decide(code, "approve", {
        cookie: await kit.sessionCookie(ownerId),
        origin: "https://evil.example",
      }),
    ).toMatchObject({ status: 403 });
    expect((await poll(requestId)).body).toEqual({ status: "pending" });
  });

  it("approves only the request that shows the code, and only once", async () => {
    const first = await start();
    const second = await start(newMac(), "Mac mini");
    const cookie = await kit.sessionCookie(ownerId);

    expect(await decide("BBBB-BBBB", "approve", { cookie })).toMatchObject({
      status: 404,
    });
    expect((await decide(first.code, "approve", { cookie })).status).toBe(200);
    expect(await decide(first.code, "deny", { cookie })).toMatchObject({
      status: 404,
    });

    expect((await poll(first.requestId)).body).toMatchObject({
      status: "approved",
    });
    expect((await poll(second.requestId)).body).toEqual({ status: "pending" });
    expect(await kit.db.$count(machines)).toBe(1);
  });

  it("connects the Mac to the account that approved it, not another", async () => {
    const otherId = await kit.addAccount("someone");
    const { mac, requestId, code } = await start();
    await decide(code, "approve", { cookie: await kit.sessionCookie(otherId) });

    const answer = (await poll(requestId)).body;
    const machineId = answer.machine?.id ?? "";
    expect(answer.user).toBe("someone");
    expect(await upload("qingqi", machineId, mac.privateKey)).toBe(401);
    expect(await upload("someone", machineId, mac.privateKey)).toBe(200);
    expect(
      await kit.db
        .select({ userId: machines.userId })
        .from(machines)
        .where(eq(machines.machineId, machineId)),
    ).toEqual([{ userId: otherId }]);
  });

  it("refuses a key that is not an Ed25519 public key", async () => {
    const response = await handlers().start(
      new Request(`${ORIGIN}/api/v1/connect`, {
        method: "POST",
        body: JSON.stringify({
          publicKey: Buffer.alloc(31).toString("base64"),
          name: "Mac",
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("slows down a Mac that polls too often", async () => {
    const { requestId } = await start();
    const statuses: number[] = [];
    for (let index = 0; index < 21; index++) {
      statuses.push((await poll(requestId)).status);
    }
    expect(statuses.at(-2)).toBe(200);
    expect(statuses.at(-1)).toBe(429);
  });
});
