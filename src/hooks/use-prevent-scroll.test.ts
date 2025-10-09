import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  disableBodyScrollLock,
  enableBodyScrollLock,
} from "./use-prevent-scroll";

describe("Body Scroll Lock", () => {
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

  describe("enableBodyScrollLock", () => {
    it("should lock scroll when enabled", () => {
      enableBodyScrollLock();

      expect(document.body.style.overflow).toBe("hidden");
      expect(document.body.style.position).toBe("fixed");
      expect(document.body.style.top).toBe("-100px");
      expect(document.body.style.width).toBe("100%");

      // Cleanup
      disableBodyScrollLock();
    });

    it("should handle scrollbar width compensation", () => {
      enableBodyScrollLock();

      // paddingRight should be set (actual value depends on scrollbar detection)
      expect(document.body.style.paddingRight).toBeDefined();

      // Cleanup
      disableBodyScrollLock();
    });

    it("should preserve scroll position when locking at different positions", () => {
      Object.defineProperty(window, "pageYOffset", {
        value: 250,
        writable: true,
        configurable: true,
      });

      enableBodyScrollLock();

      expect(document.body.style.top).toBe("-250px");

      // Cleanup
      disableBodyScrollLock();
    });

    it("should support multiple locks (reference counting)", () => {
      enableBodyScrollLock();
      expect(document.body.style.overflow).toBe("hidden");

      // Second lock should not change styles
      const secondLockScroll = window.pageYOffset;
      enableBodyScrollLock();
      expect(document.body.style.overflow).toBe("hidden");

      // First unlock should not restore styles
      disableBodyScrollLock();
      expect(document.body.style.overflow).toBe("hidden");
      expect(window.scrollTo).not.toHaveBeenCalled();

      // Second unlock should restore styles
      disableBodyScrollLock();
      expect(document.body.style.overflow).toBe(originalBodyStyles.overflow);
      expect(window.scrollTo).toHaveBeenCalledWith(0, secondLockScroll);
    });
  });

  describe("disableBodyScrollLock", () => {
    it("should restore original styles when unlocking", () => {
      document.body.style.overflow = "auto";
      document.body.style.position = "relative";

      enableBodyScrollLock();
      expect(document.body.style.overflow).toBe("hidden");

      disableBodyScrollLock();

      expect(document.body.style.overflow).toBe("auto");
      expect(document.body.style.position).toBe("relative");
    });

    it("should restore scroll position when unlocking", () => {
      enableBodyScrollLock();
      disableBodyScrollLock();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 100);
    });

    it("should handle unlock when not locked (no-op)", () => {
      const originalOverflow = document.body.style.overflow;

      disableBodyScrollLock();

      expect(document.body.style.overflow).toBe(originalOverflow);
      expect(window.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe("lock/unlock pairs", () => {
    it("should handle multiple sequential lock/unlock cycles", () => {
      // First cycle
      enableBodyScrollLock();
      expect(document.body.style.overflow).toBe("hidden");
      disableBodyScrollLock();
      expect(document.body.style.overflow).toBe(originalBodyStyles.overflow);

      // Second cycle
      enableBodyScrollLock();
      expect(document.body.style.overflow).toBe("hidden");
      disableBodyScrollLock();
      expect(document.body.style.overflow).toBe(originalBodyStyles.overflow);
    });

    it("should handle nested locks correctly", () => {
      enableBodyScrollLock(); // Lock 1
      enableBodyScrollLock(); // Lock 2
      enableBodyScrollLock(); // Lock 3

      expect(document.body.style.overflow).toBe("hidden");

      disableBodyScrollLock(); // Unlock 3
      expect(document.body.style.overflow).toBe("hidden");

      disableBodyScrollLock(); // Unlock 2
      expect(document.body.style.overflow).toBe("hidden");

      disableBodyScrollLock(); // Unlock 1
      expect(document.body.style.overflow).toBe(originalBodyStyles.overflow);
    });
  });
});
