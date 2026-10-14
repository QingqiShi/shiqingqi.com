import { describe, expect, it } from "vitest";
import { withPending, withPendingKey } from "./with-pending.ts";

describe("withPending", () => {
  it("is pending while the action runs and resolves to its result", async () => {
    const states: boolean[] = [];
    const result = await withPending(
      (pending) => states.push(pending),
      () => {
        expect(states).toEqual([true]);
        return Promise.resolve(42);
      },
    );
    expect(result).toBe(42);
    expect(states).toEqual([true, false]);
  });

  it("resets the state and rethrows when the action throws", async () => {
    const states: boolean[] = [];
    const failure = new Error("refused");
    await expect(
      withPending(
        (pending) => states.push(pending),
        () => Promise.reject(failure),
      ),
    ).rejects.toBe(failure);
    expect(states).toEqual([true, false]);
  });
});

describe("withPendingKey", () => {
  it("sets the key while the action runs, then null", async () => {
    const states: ("save" | null)[] = [];
    await expect(
      withPendingKey(
        (key: "save" | null) => states.push(key),
        "save",
        () => Promise.reject(new Error("refused")),
      ),
    ).rejects.toThrow("refused");
    expect(states).toEqual(["save", null]);
  });
});
