import { describe, expect, it } from "vitest";
import { makeMachineRegistry } from "../machines/make-machine-registry.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import { MemoryBuddyKv } from "../store/memory-buddy-kv.ts";
import { readPetState } from "./read-pet-state.ts";

const userId = "00000000-0000-4000-8000-000000000001";

describe("readPetState", () => {
  it("reads a public account with no Mac as an empty pet, and an unknown name as null", async () => {
    const kv = new MemoryBuddyKv();
    await makeMachineRegistry({ kv, secret: "test" }).setVisibility({
      userId,
      name: "qingqi",
      isPublic: true,
    });
    expect(await readPetState(kv, "qingqi")).toMatchObject({
      user: "qingqi",
      updatedAt: null,
      days: [],
    });
    expect(await readPetState(kv, "nobody")).toBeNull();
  });

  it("reads a private account as null, as a name nobody has, but shows it to its owner", async () => {
    const kv = new MemoryBuddyKv();
    const registry = makeMachineRegistry({ kv, secret: "test" });
    await registry.setVisibility({ userId, name: "qingqi", isPublic: true });
    await kv.addToSet(buddyKeys.accountMacs("qingqi"), ["mac-a"]);
    await registry.setVisibility({ userId, name: "qingqi", isPublic: false });

    expect(await readPetState(kv, "qingqi")).toBeNull();
    expect(
      await readPetState(kv, "qingqi", { includePrivate: true }),
    ).toMatchObject({ user: "qingqi" });
  });
});
