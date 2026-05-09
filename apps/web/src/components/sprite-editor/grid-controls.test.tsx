import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#src/test-utils.tsx";
import { GridControls } from "./grid-controls";
import type { GridConfig, OutputConfig, SourceImage } from "./types";

// Structural ImageBitmap — `GridControls` doesn't touch the bitmap, only
// `source.width` / `source.height`, but the prop type still requires one.
const FAKE_BITMAP: ImageBitmap = {
  width: 256,
  height: 256,
  close: () => undefined,
};

const SOURCE: SourceImage = {
  bitmap: FAKE_BITMAP,
  width: 256,
  height: 256,
  name: "sheet.png",
};

const GRID: GridConfig = {
  cols: 4,
  rows: 4,
  offsetX: 8,
  offsetY: 8,
  cellWidth: 32,
  cellHeight: 32,
  gapX: 0,
  gapY: 0,
};

const OUTPUT: OutputConfig = { width: 32, height: 32 };

function setup() {
  const onGridChange = vi.fn<(next: GridConfig) => void>();
  const onOutputChange = vi.fn<(next: OutputConfig) => void>();
  render(
    <GridControls
      source={SOURCE}
      grid={GRID}
      onGridChange={onGridChange}
      output={OUTPUT}
      onOutputChange={onOutputChange}
    />,
  );
  return { onGridChange, onOutputChange };
}

describe("GridControls blank-input handling", () => {
  it.each([
    ["grid-cols", "onGridChange"],
    ["grid-rows", "onGridChange"],
    ["grid-cell-w", "onGridChange"],
    ["grid-cell-h", "onGridChange"],
    ["grid-offset-x", "onGridChange"],
    ["grid-offset-y", "onGridChange"],
    ["grid-gap-x", "onGridChange"],
    ["grid-gap-y", "onGridChange"],
    ["output-width", "onOutputChange"],
    ["output-height", "onOutputChange"],
  ] as const)(
    "%s does not dispatch when the field is cleared mid-edit",
    (testId, callbackName) => {
      const callbacks = setup();
      const callback = callbacks[callbackName];

      const input = screen.getByTestId(testId);
      // Simulate the "Cmd+A, Delete" gesture — the input briefly sees an
      // empty string. With the bug present, this dispatches a numeric 0
      // (which the destructive Cols/Rows/Cell-W/H clamps then snap to 1).
      fireEvent.change(input, { target: { value: "" } });

      expect(callback).not.toHaveBeenCalled();
    },
  );

  it("still dispatches non-empty numeric input", () => {
    const { onGridChange } = setup();
    const input = screen.getByTestId("grid-cols");

    fireEvent.change(input, { target: { value: "8" } });

    expect(onGridChange).toHaveBeenCalledTimes(1);
    const lastCall = onGridChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    if (lastCall === undefined) return;
    expect(lastCall[0].cols).toBe(8);
  });

  it("dispatches 0 when the user explicitly types '0' (distinct from blank)", () => {
    // Offset/gap fields legitimately accept 0; the fix must not block that.
    const { onGridChange } = setup();
    const input = screen.getByTestId("grid-offset-x");

    fireEvent.change(input, { target: { value: "0" } });

    expect(onGridChange).toHaveBeenCalledTimes(1);
    const lastCall = onGridChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    if (lastCall === undefined) return;
    expect(lastCall[0].offsetX).toBe(0);
  });
});
