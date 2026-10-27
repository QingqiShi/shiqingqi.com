import { act, renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
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
  it("returns true by default before a ref is attached", () => {
    const { result } = renderHook(() => useIsElementVisible());
    expect(result.current.isVisible).toBe(true);
  });

  it("observes the element when the ref callback receives a node", () => {
    const el = document.createElement("div");
    const { result } = renderHook(() => useIsElementVisible());
    act(() => {
      result.current.setRef(el);
    });
    expect(observeSpy).toHaveBeenCalledWith(el);
  });

  it("returns false when observer reports not intersecting", () => {
    const el = document.createElement("div");
    const { result } = renderHook(() => useIsElementVisible());

    act(() => {
      result.current.setRef(el);
    });

    act(() => {
      observerCallback?.([{ isIntersecting: false }]);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it("returns true when observer reports intersecting", () => {
    const el = document.createElement("div");
    const { result } = renderHook(() => useIsElementVisible());

    act(() => {
      result.current.setRef(el);
    });

    act(() => {
      observerCallback?.([{ isIntersecting: false }]);
    });
    expect(result.current.isVisible).toBe(false);

    act(() => {
      observerCallback?.([{ isIntersecting: true }]);
    });
    expect(result.current.isVisible).toBe(true);
  });

  it("reattaches the observer when the ref target changes", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    const { result } = renderHook(() => useIsElementVisible());

    act(() => {
      result.current.setRef(first);
    });
    expect(observeSpy).toHaveBeenLastCalledWith(first);

    act(() => {
      result.current.setRef(second);
    });
    expect(disconnectSpy).toHaveBeenCalled();
    expect(observeSpy).toHaveBeenLastCalledWith(second);
  });

  it("disconnects observer on unmount", () => {
    const el = document.createElement("div");
    const { result, unmount } = renderHook(() => useIsElementVisible());
    act(() => {
      result.current.setRef(el);
    });

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
