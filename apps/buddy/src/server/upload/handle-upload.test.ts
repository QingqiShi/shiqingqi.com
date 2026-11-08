import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PetDay } from "#src/pet/types.ts";
import {
  createBuddyTestKit,
  TEST_SECRET,
} from "#src/testing/create-buddy-test-kit.ts";
import { sampleUpload } from "#src/testing/sample-upload.ts";
import { macKeySeal } from "../machines/mac-key-seal.ts";
import { machineStore } from "../machines/machine-store.ts";
import { readPetState } from "../snapshot/read-pet-state.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import { handleUpload, MAX_UPLOAD_BYTES } from "./handle-upload.ts";
import type { UploadBody } from "./upload-body-schema.ts";
import { rawPublicKey, signUpload } from "./verify-upload-signature.ts";

const USER = "qingqi";

type Kit = Awaited<ReturnType<typeof createBuddyTestKit>>;

let kit: Kit;
let userId: string;
let machine: string;
const machineKey = generateKeyPairSync("ed25519");

function encode(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value));
}

function bodyOf(overrides: Partial<UploadBody> = {}) {
  return encode(
    sampleUpload({
      at: kit.clock.now,
      days: [{ day: "2026-11-07", tokens: 100, costUsd: 1 }],
      ...overrides,
    }),
  );
}

function signedRequest({
  body = bodyOf(),
  privateKey = machineKey.privateKey,
  sentBody = body,
  machineId = machine,
}: {
  body?: Uint8Array;
  privateKey?: KeyObject;
  sentBody?: Uint8Array;
  machineId?: string;
} = {}) {
  const headers = signUpload({
    user: USER,
    machine: machineId,
    privateKey,
    body,
  });
  return new Request(`https://buddy.test/api/v1/u/${USER}/upload`, {
    method: "POST",
    headers,
    body: Buffer.from(sentBody),
  });
}

function upload(request: Request) {
  return handleUpload(request, USER, {
    kv: kit.kv,
    secret: TEST_SECRET,
    now: () => kit.clock.now,
  });
}

async function days(): Promise<PetDay[]> {
  return (await readPetState(kit.kv, USER))?.days ?? [];
}

beforeEach(async () => {
  kit = await createBuddyTestKit();
  userId = await kit.addAccount(USER);
  const publicKey = rawPublicKey(machineKey.publicKey);
  ({ machineId: machine } = await machineStore.connect(kit.db, {
    userId,
    publicKey,
    name: "MacBook Pro",
    now: new Date(kit.clock.now),
  }));
  await kit.registry.connect({
    machineId: machine,
    userId,
    name: USER,
    publicKey,
  });
});

afterEach(async () => {
  await kit.db.close();
});

describe("handleUpload", () => {
  it("stores a correctly signed upload", async () => {
    const response = await upload(signedRequest());
    expect(response.status).toBe(200);
    expect(await readPetState(kit.kv, USER)).toMatchObject({
      updatedAt: kit.clock.now,
      days: [{ day: "2026-11-07", tokens: 100, costUsd: 1 }],
    });
  });

  it("stores an upload for a private page, which only its owner reads", async () => {
    await kit.registry.setVisibility({ userId, name: USER, isPublic: false });
    expect((await upload(signedRequest())).status).toBe(200);
    expect(await readPetState(kit.kv, USER)).toBeNull();
    expect(
      await readPetState(kit.kv, USER, { includePrivate: true }),
    ).toMatchObject({ updatedAt: kit.clock.now });
  });

  it("never shrinks a day that the Mac sent before", async () => {
    await upload(
      signedRequest({
        body: bodyOf({
          days: [
            { day: "2026-11-06", tokens: 100, costUsd: 1 },
            { day: "2026-11-07", tokens: 50, costUsd: 3 },
          ],
        }),
      }),
    );
    kit.clock.now += 5 * 60_000;
    expect(
      (
        await upload(
          signedRequest({
            body: bodyOf({
              days: [{ day: "2026-11-07", tokens: 70, costUsd: 1 }],
            }),
          }),
        )
      ).status,
    ).toBe(200);
    expect(await days()).toEqual([
      { day: "2026-11-06", tokens: 100, costUsd: 1 },
      { day: "2026-11-07", tokens: 70, costUsd: 3 },
    ]);
  });

  it.each([
    [
      "another key",
      () =>
        signedRequest({
          privateKey: generateKeyPairSync("ed25519").privateKey,
        }),
    ],
    [
      "a changed body",
      () =>
        signedRequest({ sentBody: bodyOf({ pet: { fed: 99, patted: 0 } }) }),
    ],
    [
      "a machine id that has no key",
      () => signedRequest({ machineId: "mac-unknown00" }),
    ],
    [
      "an `at` older than two minutes",
      () =>
        signedRequest({ body: bodyOf({ at: kit.clock.now - 2 * 60_000 - 1 }) }),
    ],
  ])("refuses an upload with %s", async (_name, request) => {
    expect((await upload(request())).status).toBe(401);
    expect(await days()).toEqual([]);
  });

  it("does not trust a key entry that was sealed without the server secret", async () => {
    const attacker = generateKeyPairSync("ed25519");
    await kit.kv.set(
      buddyKeys.macKey(machine),
      macKeySeal.seal(
        {
          machineId: machine,
          userId,
          name: USER,
          publicKey: rawPublicKey(attacker.publicKey),
        },
        "a-guessed-secret",
      ),
    );
    expect(
      (await upload(signedRequest({ privateKey: attacker.privateKey }))).status,
    ).toBe(401);
    expect(await days()).toEqual([]);
  });

  it("refuses a replay, and an upload that is not newer than the last one", async () => {
    const request = signedRequest();
    const replay = request.clone();
    expect((await upload(request)).status).toBe(200);
    expect((await upload(replay)).status).toBe(401);

    kit.clock.now += 60_000;
    const older = bodyOf({
      at: kit.clock.now - 90_000,
      days: [{ day: "2026-11-07", tokens: 999, costUsd: 9 }],
    });
    expect((await upload(signedRequest({ body: older }))).status).toBe(401);
    expect(await days()).toEqual([
      { day: "2026-11-07", tokens: 100, costUsd: 1 },
    ]);
  });

  it("refuses a signed body with a key the schema does not know", async () => {
    const body = encode({
      ...sampleUpload({ at: kit.clock.now }),
      prTitle: "secret",
    });
    expect((await upload(signedRequest({ body }))).status).toBe(400);
    expect(await days()).toEqual([]);
  });

  it("refuses a body over the size limit", async () => {
    const body = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    expect((await upload(signedRequest({ body }))).status).toBe(413);
  });
});
