import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OwnerPetState } from "#src/pet/types.ts";
import { createBuddyTestKit } from "#src/testing/create-buddy-test-kit.ts";
import { machineStore } from "../machines/machine-store.ts";
import { readPetState } from "../snapshot/read-pet-state.ts";
import { makeAccountHandlers } from "./make-account-handlers.ts";

const ORIGIN = "https://buddy.test";

let kit: Awaited<ReturnType<typeof createBuddyTestKit>>;
let expired: string[];

function handlers() {
  return makeAccountHandlers({
    getDb: () => kit.db,
    registry: kit.registry,
    readOwnPetState: (name) =>
      readPetState(kit.kv, name, { includePrivate: true }),
    onVisibilityChanged: (name) => {
      expired.push(name);
    },
    now: () => new Date(kit.clock.now),
  });
}

function setVisibility(body: unknown, cookie?: string) {
  return handlers().setVisibility(
    new Request(`${ORIGIN}/api/account/visibility`, {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  kit = await createBuddyTestKit();
  expired = [];
});

afterEach(async () => {
  await kit.db.close();
});

describe("setVisibility", () => {
  it("makes the owner's page public and private again, and expires its cache each time", async () => {
    const userId = await kit.addAccount("qingqi", { isPublic: false });
    const cookie = await kit.sessionCookie(userId);

    expect((await setVisibility({ public: true }, cookie)).status).toBe(200);
    expect(await readPetState(kit.kv, "qingqi")).not.toBeNull();

    expect((await setVisibility({ public: false }, cookie)).status).toBe(200);
    expect(await readPetState(kit.kv, "qingqi")).toBeNull();
    expect(expired).toEqual(["qingqi", "qingqi"]);
  });

  it("changes nothing without a session", async () => {
    await kit.addAccount("qingqi", { isPublic: false });

    expect((await setVisibility({ public: true })).status).toBe(401);
    expect(await readPetState(kit.kv, "qingqi")).toBeNull();
    expect(expired).toEqual([]);
  });
});

describe("ownPetState", () => {
  it("reads a private page for its owner and counts the connected Macs before the first upload", async () => {
    const userId = await kit.addAccount("qingqi", { isPublic: false });
    await machineStore.connect(kit.db, {
      userId,
      publicKey: "key",
      name: "MacBook",
      now: new Date(kit.clock.now),
    });
    const response = await handlers().ownPetState(
      new Request(`${ORIGIN}/api/account/pet`, {
        headers: { Cookie: await kit.sessionCookie(userId) },
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as OwnerPetState;
    expect(body.user).toBe("qingqi");
    expect(body.updatedAt).toBeNull();
    expect(body.connectedMacs).toBe(1);
  });
});
