import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeOpenMarkers,
  createMarkerTracker,
  useSmoothedText,
} from "./use-smoothed-text";

describe("closeOpenMarkers", () => {
  it("closes unclosed bold", () => {
    expect(closeOpenMarkers("Hello **world")).toBe("Hello **world**");
  });

  it("closes unclosed code fence", () => {
    expect(closeOpenMarkers("```js\nconst x = 1")).toBe(
      "```js\nconst x = 1\n```",
    );
  });

  it("does not close markers inside code fences", () => {
    expect(closeOpenMarkers("```\n**not bold\n```")).toBe(
      "```\n**not bold\n```",
    );
  });

  it("treats * at line start followed by space as list marker", () => {
    expect(closeOpenMarkers("* list item")).toBe("* list item");
    expect(closeOpenMarkers("line\n* list item")).toBe("line\n* list item");
  });

  it("strips opening markers with no content during progressive reveal", () => {
    // Progressive reveal of **bold** should never flash raw asterisks
    expect(closeOpenMarkers("*")).toBe("");
    expect(closeOpenMarkers("**")).toBe("");
    expect(closeOpenMarkers("**b")).toBe("**b**");
    expect(closeOpenMarkers("**bo")).toBe("**bo**");
    expect(closeOpenMarkers("**bold")).toBe("**bold**");
    expect(closeOpenMarkers("**bold*")).toBe("**bold**");
    expect(closeOpenMarkers("**bold**")).toBe("**bold**");
  });
});

describe("createMarkerTracker", () => {
  it("matches closeOpenMarkers at every reveal position for emphasis", () => {
    const targets = [
      "Hello **bold** and *italic* text",
      "Mixed **bold *and italic*** end",
      "~~strike~~ and **bold** done",
      "* list\n* items\n**bold** end",
      "Some ***bold italic*** here",
    ];
    for (const target of targets) {
      const tracker = createMarkerTracker();
      for (let len = 1; len <= target.length; len++) {
        const incremental = tracker.closeAt(target, len);
        const standalone = closeOpenMarkers(target.slice(0, len));
        expect(incremental).toBe(standalone);
      }
    }
  });
});

describe("useSmoothedText", () => {
  let rafCallbacks: Array<FrameRequestCallback>;
  let nextRafId: number;
  let mockTimestamp: number;

  /** Step N frames at 60fps (16.67ms apart) */
  function stepFrames(count: number) {
    for (let i = 0; i < count; i++) {
      mockTimestamp += 16.67;
      const callbacks = [...rafCallbacks];
      rafCallbacks = [];
      act(() => {
        for (const cb of callbacks) cb(mockTimestamp);
      });
    }
  }

  beforeEach(() => {
    rafCallbacks = [];
    nextRafId = 1;
    mockTimestamp = 1000;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return nextRafId++;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
      rafCallbacks = [];
    });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns target text immediately when reduced motion is preferred", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useSmoothedText("Instant text"));
    act(() => {});
    expect(result.current).toBe("Instant text");
  });

  it("handles growing text incrementally", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "Hello" } },
    );

    // Catch up to first chunk
    stepFrames(40);
    expect(result.current).toBe("Hello");

    // New chunk arrives
    rerender({ text: "Hello world" });

    // Should not lose already-revealed text
    stepFrames(1);
    expect(result.current.length).toBeGreaterThanOrEqual("Hello".length);

    // Eventually catches up
    stepFrames(200);
    expect(result.current).toBe("Hello world");
  });

  it("never splits a surrogate pair (emoji)", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "A" } },
    );

    stepFrames(40);
    // Text with emoji (surrogate pair: 2 UTF-16 code units)
    rerender({ text: "A 😀 done" });

    // Step through frames and verify no lone surrogate appears
    for (let i = 0; i < 100; i++) {
      const text = result.current;
      // A lone high surrogate would produce a replacement character
      // Check that every char in the output is valid
      for (let j = 0; j < text.length; j++) {
        const code = text.charCodeAt(j);
        // High surrogate must be followed by low surrogate
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = text.charCodeAt(j + 1);
          expect(next).toBeGreaterThanOrEqual(0xdc00);
          expect(next).toBeLessThanOrEqual(0xdfff);
        }
      }
      stepFrames(1);
    }

    expect(result.current).toBe("A 😀 done");
  });
});
