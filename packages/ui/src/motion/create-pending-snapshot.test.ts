import { describe, expect, it } from "vitest";
import { createPendingSnapshot } from "./create-pending-snapshot.ts";

function setUp() {
  let reads = 0;
  const pending = createPendingSnapshot(() => ++reads);
  return { pending, reads: () => reads };
}

describe("createPendingSnapshot", () => {
  it("gives the snapshot to a motion that lands at its key", () => {
    const { pending } = setUp();
    pending.take("/b");
    expect(pending.claim("/b", true)).toBe(1);
    expect(pending.claim("/b", true)).toBeNull();
  });

  it("drops the snapshot for a motion that lands elsewhere", () => {
    const { pending } = setUp();
    pending.take("/b");
    expect(pending.claim("/c", true)).toBeNull();
    expect(pending.claim("/b", true)).toBeNull();
  });

  it("drops the snapshot for a commit at its key with no motion", () => {
    const { pending } = setUp();
    pending.take("/b");
    expect(pending.claim("/b", false)).toBeNull();
    expect(pending.claim("/b", true)).toBeNull();
  });

  it("keeps the snapshot through an unrelated commit with no motion, and reads it fresh", () => {
    const { pending, reads } = setUp();
    pending.take("/b");
    expect(pending.claim("/a", false)).toBeNull();
    pending.refresh();
    expect(reads()).toBe(2);
    expect(pending.claim("/b", true)).toBe(2);
  });

  it("reads nothing on refresh while nothing waits", () => {
    const { pending, reads } = setUp();
    pending.refresh();
    expect(reads()).toBe(0);
  });
});
