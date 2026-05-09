import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
