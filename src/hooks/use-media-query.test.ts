import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./use-media-query";

let currentMatches: boolean;
let listeners: Set<() => void>;
let addEventListenerSpy: ReturnType<typeof vi.fn>;
let removeEventListenerSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  currentMatches = false;
  listeners = new Set();
  addEventListenerSpy = vi.fn((_event: string, handler: () => void) => {
    listeners.add(handler);
  });
  removeEventListenerSpy = vi.fn((_event: string, handler: () => void) => {
    listeners.delete(handler);
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn(() => ({
      get matches() {
        return currentMatches;
      },
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    })),
  });
});

describe("useMediaQuery", () => {
  it("returns the current match state", () => {
    currentMatches = true;
    const { result } = renderHook(() =>
      useMediaQuery("(prefers-color-scheme: dark)"),
    );
    expect(result.current).toBe(true);
  });

  it("returns false when the query does not match", () => {
    currentMatches = false;
    const { result } = renderHook(() =>
      useMediaQuery("(prefers-color-scheme: dark)"),
    );
    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    currentMatches = false;
    const { result } = renderHook(() =>
      useMediaQuery("(prefers-color-scheme: dark)"),
    );
    expect(result.current).toBe(false);

    act(() => {
      currentMatches = true;
      for (const listener of listeners) listener();
    });

    expect(result.current).toBe(true);
  });

  it("does not re-subscribe on re-render with the same query", () => {
    const { rerender } = renderHook(() =>
      useMediaQuery("(prefers-color-scheme: dark)"),
    );

    const initialAddCalls = addEventListenerSpy.mock.calls.length;
    const initialRemoveCalls = removeEventListenerSpy.mock.calls.length;

    rerender();

    // No additional subscribe/unsubscribe calls should occur
    expect(addEventListenerSpy.mock.calls.length).toBe(initialAddCalls);
    expect(removeEventListenerSpy.mock.calls.length).toBe(initialRemoveCalls);
  });

  it("cleans up the listener on unmount", () => {
    const { unmount } = renderHook(() =>
      useMediaQuery("(prefers-color-scheme: dark)"),
    );

    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledOnce();
  });
});
