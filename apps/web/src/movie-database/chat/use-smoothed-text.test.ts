import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeOpenMarkers,
  createMarkerTracker,
  useSmoothedText,
} from "./use-smoothed-text";

describe("closeOpenMarkers", () => {
  it("returns text unchanged when no markers present", () => {
    expect(closeOpenMarkers("Hello world")).toBe("Hello world");
  });

  it("returns text unchanged when all markers are closed", () => {
    expect(closeOpenMarkers("**bold** and *italic*")).toBe(
      "**bold** and *italic*",
    );
  });

  it("closes unclosed bold", () => {
    expect(closeOpenMarkers("Hello **world")).toBe("Hello **world**");
  });

  it("closes unclosed italic", () => {
    expect(closeOpenMarkers("Hello *world")).toBe("Hello *world*");
  });

  it("closes unclosed bold+italic", () => {
    expect(closeOpenMarkers("Hello ***world")).toBe("Hello ***world***");
  });

  it("closes unclosed inline code", () => {
    expect(closeOpenMarkers("Hello `code")).toBe("Hello `code`");
  });

  it("closes unclosed strikethrough", () => {
    expect(closeOpenMarkers("Hello ~~strike")).toBe("Hello ~~strike~~");
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

  it("does not close markers inside inline code", () => {
    expect(closeOpenMarkers("`**not bold`")).toBe("`**not bold`");
  });

  it("handles multiple unclosed markers", () => {
    const result = closeOpenMarkers("**bold and *italic");
    expect(result).toBe("**bold and *italic***");
  });

  it("treats * at line start followed by space as list marker", () => {
    expect(closeOpenMarkers("* list item")).toBe("* list item");
    expect(closeOpenMarkers("line\n* list item")).toBe("line\n* list item");
  });

  it("returns empty string unchanged", () => {
    expect(closeOpenMarkers("")).toBe("");
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

  it("strips partial closing bold marker instead of adding extra asterisks", () => {
    expect(closeOpenMarkers("Some **text*")).toBe("Some **text**");
  });

  it("strips opening bold+italic markers with no content", () => {
    expect(closeOpenMarkers("***")).toBe("");
    expect(closeOpenMarkers("Hello ***")).toBe("Hello ");
  });

  it("strips opening strikethrough markers with no content", () => {
    expect(closeOpenMarkers("~~")).toBe("");
    expect(closeOpenMarkers("Hello ~~")).toBe("Hello ");
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

  it("handles code fences incrementally", () => {
    const tracker = createMarkerTracker();
    const target = "```js\nconst x = 1\n```\nafter";

    // Before fence is fully revealed — backticks stripped
    expect(tracker.closeAt(target, 2)).toBe("");

    // After content is visible, fence should be closed
    tracker.reset();
    expect(tracker.closeAt(target, 10)).toBe("```js\ncons\n```");

    // Full text
    tracker.reset();
    expect(tracker.closeAt(target, target.length)).toBe(target);
  });

  it("resets when text gets shorter", () => {
    const tracker = createMarkerTracker();
    tracker.closeAt("Hello **bold", 12);

    const result = tracker.closeAt("Hi", 2);
    expect(result).toBe("Hi");
  });
});

describe("useSmoothedText", () => {
  let rafCallbacks: Array<FrameRequestCallback>;
  let nextRafId: number;
  let cancelRafSpy: ReturnType<typeof vi.spyOn>;
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
    cancelRafSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {
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

  it("returns target text immediately when already caught up", () => {
    const { result } = renderHook(() => useSmoothedText("Hello world"));
    expect(result.current).toBe("Hello world");
  });

  it("gradually reveals text as it grows", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "Hi" } },
    );

    // Catch up to initial chunk
    stepFrames(40);
    expect(result.current).toBe("Hi");

    // Simulate a large new chunk arriving
    rerender({ text: "Hi, this is a longer streaming text!" });

    // After several frames, text should be partially revealed
    stepFrames(8);
    expect(result.current.length).toBeGreaterThan("Hi".length);
    expect(result.current.length).toBeLessThan(
      "Hi, this is a longer streaming text!".length,
    );

    // Eventually catches up fully
    stepFrames(200);
    expect(result.current).toBe("Hi, this is a longer streaming text!");
  });

  it("continues draining buffer after text stops changing", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "A" } },
    );

    stepFrames(40);
    rerender({ text: "A bunch of remaining text here" });

    // Partially reveal
    stepFrames(5);
    const partialLength = result.current.length;
    expect(partialLength).toBeGreaterThan(1);
    expect(partialLength).toBeLessThan("A bunch of remaining text here".length);

    // Text stops changing — loop should continue draining
    stepFrames(300);
    expect(result.current).toBe("A bunch of remaining text here");
  });

  it("decelerates visibly at the tail", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "X" } },
    );

    stepFrames(40);
    rerender({ text: "X" + "a".repeat(60) });

    // Let it get close to the end but not finish
    stepFrames(80);
    const nearEndLength = result.current.length;

    // Measure how many chars are revealed in the next 30 frames
    stepFrames(30);
    const afterLength = result.current.length;
    const charsInLast30Frames = afterLength - nearEndLength;

    // At the tail, reveal rate should be noticeably slow
    // 30 frames at 60fps = 500ms. At ~2 chars/sec, expect ≤ 3 chars
    // Allow some tolerance for easing dynamics
    expect(charsInLast30Frames).toBeLessThanOrEqual(8);
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

  it("resets when text gets shorter", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "A very long first message" } },
    );

    // Catch up fully
    stepFrames(200);
    expect(result.current).toBe("A very long first message");

    // New shorter text (new streaming session)
    rerender({ text: "Short" });

    // After catching up, should show the new text
    stepFrames(200);
    expect(result.current).toBe("Short");
  });

  it("cleans up animation frame on unmount", () => {
    const { rerender, unmount } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "A" } },
    );
    stepFrames(20);
    // Grow text to start an active rAF loop
    rerender({ text: "A longer text to animate" });
    stepFrames(2);
    unmount();
    expect(cancelRafSpy).toHaveBeenCalled();
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

  it("calls onCaughtUp when already caught up on mount", () => {
    const onCaughtUp = vi.fn();
    renderHook(() => useSmoothedText("Hello", { onCaughtUp }));
    // Effect runs synchronously after render in test environment
    expect(onCaughtUp).toHaveBeenCalledTimes(1);
  });

  it("calls onCaughtUp after animation catches up", () => {
    const onCaughtUp = vi.fn();
    const { rerender } = renderHook(
      ({ text }) => useSmoothedText(text, { onCaughtUp }),
      { initialProps: { text: "A" } },
    );

    stepFrames(40);
    onCaughtUp.mockClear();

    // Grow text to start animation
    rerender({ text: "A bunch of new text" });

    // Not caught up yet
    stepFrames(5);
    expect(onCaughtUp).not.toHaveBeenCalled();

    // Eventually catches up
    stepFrames(300);
    expect(onCaughtUp).toHaveBeenCalled();
  });

  it("calls onCaughtUp with reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const onCaughtUp = vi.fn();
    renderHook(() => useSmoothedText("Instant text", { onCaughtUp }));
    expect(onCaughtUp).toHaveBeenCalledTimes(1);
  });

  it("does not fire onCaughtUp when sealed is false", () => {
    const onCaughtUp = vi.fn();
    const { rerender } = renderHook(
      ({ text }) => useSmoothedText(text, { onCaughtUp, sealed: false }),
      { initialProps: { text: "A" } },
    );

    stepFrames(40);
    onCaughtUp.mockClear();

    // Grow text and let it catch up
    rerender({ text: "A short text" });
    stepFrames(300);

    // Should NOT have fired because sealed is false
    expect(onCaughtUp).not.toHaveBeenCalled();
  });

  it("fires onCaughtUp when sealed changes to true after catching up", () => {
    const onCaughtUp = vi.fn();
    const { rerender } = renderHook(
      ({ text, sealed }) => useSmoothedText(text, { onCaughtUp, sealed }),
      { initialProps: { text: "A", sealed: false } },
    );

    stepFrames(40);
    onCaughtUp.mockClear();

    // Grow text and let it catch up while unsealed
    rerender({ text: "A short text", sealed: false });
    stepFrames(300);
    expect(onCaughtUp).not.toHaveBeenCalled();

    // Now seal it — should fire because already caught up
    rerender({ text: "A short text", sealed: true });
    expect(onCaughtUp).toHaveBeenCalledTimes(1);
  });

  it("animates from position 0 when startRevealed is false", () => {
    const { result } = renderHook(() =>
      useSmoothedText("Hello world", { startRevealed: false }),
    );

    // First render should show empty text, not the full text
    expect(result.current).toBe("");

    // After some frames, text should start appearing
    stepFrames(10);
    expect(result.current.length).toBeGreaterThan(0);

    // Eventually catches up
    stepFrames(300);
    expect(result.current).toBe("Hello world");
  });

  it("produces consistent speed regardless of frame rate", () => {
    // Simulate at 60fps (16.67ms frames)
    const { result: result60, rerender: rerender60 } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "A" } },
    );
    stepFrames(40);
    rerender60({ text: "A" + "x".repeat(50) });
    // Step 10 frames at 60fps = 166.7ms
    stepFrames(10);
    const length60 = result60.current.length;

    // Reset for 120fps test — simulate by halving the timestamp step
    const { result: result120, rerender: rerender120 } = renderHook(
      ({ text }) => useSmoothedText(text),
      { initialProps: { text: "A" } },
    );
    // Step 40 frames at half interval to catch up
    for (let i = 0; i < 40; i++) {
      mockTimestamp += 8.33;
      const cbs = [...rafCallbacks];
      rafCallbacks = [];
      act(() => {
        for (const cb of cbs) cb(mockTimestamp);
      });
    }
    rerender120({ text: "A" + "x".repeat(50) });
    // Step 20 frames at 120fps = 166.7ms (same wall time)
    for (let i = 0; i < 20; i++) {
      mockTimestamp += 8.33;
      const cbs = [...rafCallbacks];
      rafCallbacks = [];
      act(() => {
        for (const cb of cbs) cb(mockTimestamp);
      });
    }
    const length120 = result120.current.length;

    // Both should reveal roughly the same amount in the same wall time
    expect(Math.abs(length60 - length120)).toBeLessThanOrEqual(2);
  });

  it("factors trailingBufferHint into reveal rate to avoid tail deceleration", () => {
    const { result, rerender } = renderHook(
      ({ text, hint }) => useSmoothedText(text, { trailingBufferHint: hint }),
      { initialProps: { text: "X", hint: 0 } },
    );

    stepFrames(40);
    expect(result.current).toBe("X");

    rerender({ text: "X" + "a".repeat(60), hint: 200 });

    // With hint=200, the effective buffer (~260) keeps the rate high even
    // as remaining text in this part shrinks, avoiding tail deceleration.
    // Without a hint, 80+30 frames is not enough to finish 61 chars.
    stepFrames(80);
    expect(result.current).toBe("X" + "a".repeat(60));
  });
});
