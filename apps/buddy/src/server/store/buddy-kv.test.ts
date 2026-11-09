import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { describe, expect, it } from "vitest";
import { MemoryBuddyKv } from "./memory-buddy-kv.ts";
import { RedisBuddyKv } from "./redis-buddy-kv.ts";
import type { BuddyKv } from "./types.ts";

function kvCases(createKv: () => BuddyKv) {
  it("reads many keys, sets and members as Redis does", async () => {
    const kv = createKv();
    const key = (name: string) => `buddy:test:${randomUUID()}:${name}`;
    const [a, b, missing, set] = [
      key("a"),
      key("b"),
      key("missing"),
      key("set"),
    ];
    expect(await kv.set(a, "1")).toBe(true);
    expect(await kv.set(a, "2", { onlyIfAbsent: true })).toBe(false);
    await kv.set(b, '{"n":5000000000123}', { ttlSeconds: 60 });
    expect(await kv.getMany([a, missing, b])).toEqual([
      "1",
      null,
      '{"n":5000000000123}',
    ]);
    await kv.addToSet(set, ["mac-a", "mac-b"]);
    await kv.addToSet(set, ["mac-a"]);
    expect((await kv.setMembers(set)).sort()).toEqual(["mac-a", "mac-b"]);
    await kv.removeFromSet(set, ["mac-a", "mac-c"]);
    expect(await kv.setMembers(set)).toEqual(["mac-b"]);
    expect(await kv.setMembers(missing)).toEqual([]);
    const count = key("count");
    await kv.incrementBy([[count, 3]]);
    await kv.incrementBy([[count, 4]]);
    expect(await kv.get(count)).toBe("7");
    await kv.delMany([a, b, set, count]);
    expect(await kv.getMany([a, b])).toEqual([null, null]);
    expect(await kv.setMembers(set)).toEqual([]);
  });
}

describe("MemoryBuddyKv", () => {
  kvCases(() => new MemoryBuddyKv());
});

const redisUrl = process.env.BUDDY_TEST_REDIS_REST_URL;
const redisToken = process.env.BUDDY_TEST_REDIS_REST_TOKEN;

// Set both to an Upstash Redis that the test can write to, to run the same
// cases against Redis.
describe.skipIf(!redisUrl || !redisToken)("RedisBuddyKv", () => {
  kvCases(
    () =>
      new RedisBuddyKv(
        new Redis({
          url: redisUrl ?? "",
          token: redisToken ?? "",
          automaticDeserialization: false,
        }),
      ),
  );
});
