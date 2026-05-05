import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "#src/test-utils.tsx";
import { AnimationMode, type AnimationFrame } from "./animation-mode";
import type { CellPixels } from "./types";

function makeCell(): CellPixels {
  return {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([0, 0, 0, 255]),
  };
}

function setup(frames: readonly AnimationFrame[]) {
  const cells = [makeCell(), makeCell(), makeCell()];
  const onFramesChange = vi.fn<(next: readonly AnimationFrame[]) => void>();
  render(
    <AnimationMode
      cells={cells}
      frames={frames}
      onFramesChange={onFramesChange}
      selectedCell={0}
      baseFilename="test"
    />,
  );
  return { onFramesChange };
}

/**
 * Drive `n` rAF ticks each spaced `tickMs` apart. We advance both the
 * timer and the rAF queue together, mirroring how a real browser couples
 * its raster clock to its rAF dispatch.
 */
function advanceByRaf(n: number, tickMs: number) {
  for (let i = 0; i < n; i++) {
    act(() => {
      vi.advanceTimersByTime(tickMs);
    });
  }
}

describe("AnimationMode frame-duration blank-input handling", () => {
  it("does not dispatch when the user clears the duration field", () => {
    const frames: AnimationFrame[] = [{ cellIndex: 0, duration: 150 }];
    const { onFramesChange } = setup(frames);

    const input = screen.getByTestId("frame-duration-0");
    // Simulate "Cmd+A, Delete" — input briefly empty. With the bug present,
    // this would dispatch a numeric 0 which `setFrameDuration` clamps to
    // 1ms, silently persisting an invisible-during-playback frame.
    fireEvent.change(input, { target: { value: "" } });

    expect(onFramesChange).not.toHaveBeenCalled();
  });

  it("still dispatches a typed numeric duration", () => {
    const frames: AnimationFrame[] = [{ cellIndex: 0, duration: 150 }];
    const { onFramesChange } = setup(frames);

    const input = screen.getByTestId("frame-duration-0");
    fireEvent.change(input, { target: { value: "200" } });

    expect(onFramesChange).toHaveBeenCalledTimes(1);
    const lastCall = onFramesChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    if (lastCall === undefined) return;
    expect(lastCall[0][0].duration).toBe(200);
  });
});

describe("AnimationMode playback timing", () => {
  beforeEach(() => {
    // Vitest's fake timers also mock performance.now() and
    // requestAnimationFrame (using a 16ms tick by default).
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not re-create the rAF loop on every frame transition", () => {
    const frames: AnimationFrame[] = [
      { cellIndex: 0, duration: 20 },
      { cellIndex: 1, duration: 20 },
      { cellIndex: 2, duration: 20 },
    ];
    setup(frames);

    // Spy *after* mount so we only count rAF calls produced by the
    // playback loop. Each tick should schedule exactly one new rAF — if
    // the effect re-runs because `activeFrame` is in its deps, we'd see
    // multiple cleanup/setup cycles per advance.
    const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame");

    fireEvent.click(screen.getByTestId("play-pause"));

    // Drive 5 rAF ticks (~80ms at the default 16ms cadence). With 20ms
    // frame durations that's enough for several frame advances.
    const initialCalls = rafSpy.mock.calls.length;
    advanceByRaf(5, 16);
    const ticksScheduled = rafSpy.mock.calls.length - initialCalls;

    // We expect exactly one rAF schedule per tick we ran (the tick body
    // re-arms itself). If the effect were tearing down + setting up
    // because `activeFrame` was in its deps, we'd see strictly more —
    // the test guards against the regression that caused the drift bug.
    expect(ticksScheduled).toBeLessThanOrEqual(5);

    rafSpy.mockRestore();
  });
});
