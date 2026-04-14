import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { useIsElementVisible } from "./use-is-element-visible";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let observerCallback: ObserverCallback | null = null;
let observeSpy: MockInstance;
let disconnectSpy: MockInstance;

beforeEach(() => {
  observeSpy = vi.fn();
  disconnectSpy = vi.fn();

  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(function (this: unknown, callback: ObserverCallback) {
      observerCallback = callback;
      return { observe: observeSpy, disconnect: disconnectSpy };
    }),
  );
});

afterEach(() => {
  observerCallback = null;
  vi.restoreAllMocks();
});

describe("useIsElementVisible", () => {
  it("returns true by default when ref is null", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      return useIsElementVisible(ref);
    });
    expect(result.current).toBe(true);
  });

  it("observes the element when ref is set", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    renderHook(() => useIsElementVisible(ref));

    expect(observeSpy).toHaveBeenCalledWith(el);
  });

  it("returns false when observer reports not intersecting", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const { result } = renderHook(() => useIsElementVisible(ref));

    act(() => {
      observerCallback?.([{ isIntersecting: false }]);
    });

    expect(result.current).toBe(false);
  });

  it("returns true when observer reports intersecting", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const { result } = renderHook(() => useIsElementVisible(ref));

    act(() => {
      observerCallback?.([{ isIntersecting: false }]);
    });
    expect(result.current).toBe(false);

    act(() => {
      observerCallback?.([{ isIntersecting: true }]);
    });
    expect(result.current).toBe(true);
  });

  it("disconnects observer on unmount", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const { unmount } = renderHook(() => useIsElementVisible(ref));

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
