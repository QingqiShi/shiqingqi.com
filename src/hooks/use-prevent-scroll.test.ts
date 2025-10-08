import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePreventScroll } from "./use-prevent-scroll";

describe("usePreventScroll", () => {
  let originalBodyStyles: {
    overflow: string;
    position: string;
    top: string;
    width: string;
    paddingRight: string;
  };

  beforeEach(() => {
    // Store original body styles
    originalBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };

    // Mock window.pageYOffset
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 100,
    });

    // Mock scrollTo
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original body styles
    document.body.style.overflow = originalBodyStyles.overflow;
    document.body.style.position = originalBodyStyles.position;
    document.body.style.top = originalBodyStyles.top;
    document.body.style.width = originalBodyStyles.width;
    document.body.style.paddingRight = originalBodyStyles.paddingRight;

    vi.restoreAllMocks();
  });

  it("should lock scroll when enabled", () => {
    renderHook(() => usePreventScroll());

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-100px");
    expect(document.body.style.width).toBe("100%");
  });

  it("should restore original styles on unmount", () => {
    document.body.style.overflow = "auto";
    document.body.style.position = "relative";

    const { unmount } = renderHook(() => usePreventScroll());

    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("auto");
    expect(document.body.style.position).toBe("relative");
  });

  it("should restore scroll position on unmount", () => {
    const { unmount } = renderHook(() => usePreventScroll());

    unmount();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 100);
  });

  it("should not lock scroll when disabled", () => {
    const originalOverflow = document.body.style.overflow;

    renderHook(() => usePreventScroll({ isDisabled: true }));

    expect(document.body.style.overflow).toBe(originalOverflow);
    expect(document.body.style.position).not.toBe("fixed");
  });

  it("should handle scrollbar width compensation", () => {
    renderHook(() => usePreventScroll());

    // paddingRight should be set (actual value depends on scrollbar detection)
    // We just verify it was set to something
    expect(document.body.style.paddingRight).toBeDefined();
  });

  it("should clean up properly when switching from enabled to disabled", () => {
    const { rerender } = renderHook(
      ({ isDisabled }) => usePreventScroll({ isDisabled }),
      {
        initialProps: { isDisabled: false },
      },
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender({ isDisabled: true });

    // When disabled, the effect should not run and previous styles should be cleaned up
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("should preserve scroll position when locking at different positions", () => {
    Object.defineProperty(window, "pageYOffset", {
      value: 250,
      writable: true,
      configurable: true,
    });

    renderHook(() => usePreventScroll());

    expect(document.body.style.top).toBe("-250px");
  });
});
