import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBuddyTestKit } from "#src/testing/create-buddy-test-kit.ts";
import { readPetState } from "../snapshot/read-pet-state.ts";
import { CARE_RATE_LIMIT, handleCare } from "./handle-care.ts";

type Kit = Awaited<ReturnType<typeof createBuddyTestKit>>;

let kit: Kit;

const ORIGIN = "https://buddy.test";

function care(
  user: string,
  body: unknown,
  {
    cookie,
    ip = "203.0.113.7",
    origin = ORIGIN,
  }: { cookie?: string; ip?: string; origin?: string } = {},
) {
  return handleCare(
    new Request(`${ORIGIN}/api/v1/u/${user}/care`, {
      method: "POST",
      headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    }),
    user,
    {
      kv: kit.kv,
      getDb: () => kit.db,
      now: () => new Date(kit.clock.now),
      clientIp: () => ip,
    },
  );
}

async function visitorsOf(user: string) {
  return (
    await readPetState(kit.kv, user, {
      includePrivate: true,
      withVisitors: true,
    })
  )?.visitors;
}

beforeEach(async () => {
  kit = await createBuddyTestKit();
});

afterEach(async () => {
  await kit.db.close();
});

describe("handleCare", () => {
  it("adds every batch to the page's counts, which the read shows", async () => {
    await kit.addAccount("qingqi");
    expect((await care("qingqi", { fed: 3, patted: 0 })).status).toBe(204);
    expect(
      (await care("qingqi", { fed: 20, patted: 5 }, { ip: "198.51.100.1" }))
        .status,
    ).toBe(204);
    expect(await visitorsOf("qingqi")).toEqual({ fed: 23, patted: 5 });
  });

  it("answers a private page as an unknown name, except to its owner", async () => {
    const ownerId = await kit.addAccount("secret", { isPublic: false });
    const strangerId = await kit.addAccount("stranger");
    for (const response of [
      await care("secret", { fed: 1, patted: 1 }),
      await care(
        "secret",
        { fed: 1, patted: 1 },
        { cookie: await kit.sessionCookie(strangerId) },
      ),
      await care("nobody", { fed: 1, patted: 1 }),
    ]) {
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "not found" });
    }
    expect(await visitorsOf("secret")).toEqual({ fed: 0, patted: 0 });

    const ownerCookie = await kit.sessionCookie(ownerId);
    const crossSite = await care(
      "secret",
      { fed: 1, patted: 0 },
      { cookie: ownerCookie, origin: "https://evil.test" },
    );
    expect(crossSite.status).toBe(403);
    const own = await care(
      "secret",
      { fed: 2, patted: 0 },
      { cookie: ownerCookie },
    );
    expect(own.status).toBe(204);
    expect(await visitorsOf("secret")).toEqual({ fed: 2, patted: 0 });
  });

  it.each([
    ["a fraction", { fed: 1.5, patted: 0 }],
    ["no presses", { fed: 0, patted: 0 }],
    ["a key it does not know", { fed: 1, patted: 0, hugs: 1 }],
  ])("refuses a body with %s", async (_name, body) => {
    await kit.addAccount("qingqi");
    expect((await care("qingqi", body)).status).toBe(400);
    expect(await visitorsOf("qingqi")).toEqual({ fed: 0, patted: 0 });
  });

  it("slows down an IP that sends too many batches for one page", async () => {
    await kit.addAccount("qingqi");
    for (let i = 0; i < CARE_RATE_LIMIT.limit; i++) {
      expect((await care("qingqi", { fed: 1, patted: 0 })).status).toBe(204);
    }
    const over = await care("qingqi", { fed: 1, patted: 0 });
    expect(over.status).toBe(429);
    expect(await visitorsOf("qingqi")).toEqual({
      fed: CARE_RATE_LIMIT.limit,
      patted: 0,
    });
    expect(
      (await care("qingqi", { fed: 1, patted: 0 }, { ip: "198.51.100.1" }))
        .status,
    ).toBe(204);
  });
});
