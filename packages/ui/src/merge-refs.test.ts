import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { mergeRefs } from "./merge-refs.ts";

function trackedRef() {
  const calls: (string | null)[] = [];
  const cleanup = vi.fn();
  const ref = (node: string | null) => {
    calls.push(node);
    return node === null ? undefined : cleanup;
  };
  return { ref, calls, cleanup };
}

describe("mergeRefs", () => {
  it("returns undefined when every ref is null", () => {
    expect(mergeRefs()).toBeUndefined();
    expect(mergeRefs(null, undefined)).toBeUndefined();
  });

  it("attaches object and function refs, and detaches them once on its cleanup", () => {
    const objectRef = createRef<string>();
    const legacyCalls: (string | null)[] = [];
    const legacyRef = (node: string | null) => {
      legacyCalls.push(node);
    };
    const tracked = trackedRef();
    const merged = mergeRefs(objectRef, legacyRef, tracked.ref, null);

    const detach = merged?.("a");
    expect(objectRef.current).toBe("a");
    expect(legacyCalls).toEqual(["a"]);
    expect(tracked.calls).toEqual(["a"]);

    detach?.();
    detach?.();
    merged?.(null);
    expect(objectRef.current).toBeNull();
    expect(legacyCalls).toEqual(["a", null]);
    expect(tracked.cleanup).toHaveBeenCalledOnce();
    expect(tracked.calls).toEqual(["a"]);
  });

  it("detaches once on a call with null, then ignores its cleanup", () => {
    const objectRef = createRef<string>();
    const tracked = trackedRef();
    const merged = mergeRefs(objectRef, tracked.ref);

    const detach = merged?.("a");
    expect(merged?.(null)).toBeUndefined();
    expect(objectRef.current).toBeNull();
    expect(tracked.cleanup).toHaveBeenCalledOnce();

    detach?.();
    merged?.(null);
    expect(tracked.cleanup).toHaveBeenCalledOnce();
  });

  it("detaches the old element once when it attaches a new one", () => {
    const objectRef = createRef<string>();
    const first = vi.fn();
    const second = vi.fn();
    const ref = (node: string | null) => (node === "a" ? first : second);
    const merged = mergeRefs(objectRef, ref);

    const detachA = merged?.("a");
    const detachB = merged?.("b");
    expect(first).toHaveBeenCalledOnce();
    expect(objectRef.current).toBe("b");

    detachA?.();
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
    expect(objectRef.current).toBe("b");

    detachB?.();
    expect(second).toHaveBeenCalledOnce();
    expect(objectRef.current).toBeNull();
  });
});
