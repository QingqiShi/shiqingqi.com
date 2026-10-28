import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#src/testing/test-utils.tsx";
import { AnimationMode, type AnimationFrame } from "./animation-mode";
import type { CellPixels } from "./types";

function makeCell(): CellPixels {
  return {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([0, 0, 0, 255]),
  };
}

describe("AnimationMode frame-duration blank-input handling", () => {
  it("does not dispatch when the user clears the duration field", () => {
    const frames: AnimationFrame[] = [{ cellIndex: 0, duration: 150 }];
    const onFramesChange = vi.fn<(next: readonly AnimationFrame[]) => void>();
    render(
      <AnimationMode
        cells={[makeCell(), makeCell(), makeCell()]}
        frames={frames}
        onFramesChange={onFramesChange}
        selectedCell={0}
        baseFilename="test"
      />,
    );

    // Simulate "Cmd+A, Delete" — input briefly empty. With the bug present,
    // this would dispatch a numeric 0 which `setFrameDuration` clamps to
    // 1ms, silently persisting an invisible-during-playback frame.
    fireEvent.change(screen.getByTestId("frame-duration-0"), {
      target: { value: "" },
    });

    expect(onFramesChange).not.toHaveBeenCalled();
  });
});
