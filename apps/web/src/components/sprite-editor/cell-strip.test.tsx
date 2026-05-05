import { fireEvent, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render } from "#src/test-utils.tsx";
import { CellStrip } from "./cell-strip";
import type { CellPixels } from "./types";

// jsdom doesn't implement ResizeObserver, which the cell thumbnail uses to
// size its canvas. We don't care about the canvas in these tests — only
// the radiogroup wiring on the surrounding buttons — so a no-op stub is
// sufficient. Same pattern is used in calculator.test.tsx.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function makeCell(): CellPixels {
  return {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([0, 0, 0, 255]),
  };
}

function setup(selectedCell: number | null, cellCount = 4) {
  const cells: (CellPixels | null)[] = Array.from({ length: cellCount }, () =>
    makeCell(),
  );
  const onSelect = vi.fn<(index: number) => void>();
  const result = render(
    <CellStrip cells={cells} selectedCell={selectedCell} onSelect={onSelect} />,
  );
  return { ...result, onSelect };
}

describe("CellStrip ARIA semantics", () => {
  it("wraps the cells in a radiogroup labelled by the heading", () => {
    setup(0);

    const group = screen.getByRole("radiogroup");
    const headingId = group.getAttribute("aria-labelledby");
    expect(headingId).not.toBeNull();
    if (headingId === null) return;
    const heading = document.getElementById(headingId);
    expect(heading).not.toBeNull();
    expect(heading?.textContent ?? "").toContain("Cells");
  });

  it("renders each thumbnail as role=radio with aria-checked reflecting selection (no aria-pressed)", () => {
    setup(2);

    const thumbs = screen.getAllByRole("radio");
    expect(thumbs.length).toBe(4);
    expect(thumbs[0]).toHaveAttribute("aria-checked", "false");
    expect(thumbs[1]).toHaveAttribute("aria-checked", "false");
    expect(thumbs[2]).toHaveAttribute("aria-checked", "true");
    expect(thumbs[3]).toHaveAttribute("aria-checked", "false");
    for (const thumb of thumbs) {
      expect(thumb).not.toHaveAttribute("aria-pressed");
    }
  });

  it("rolls tabindex so only the selected thumb is in the tab sequence", () => {
    setup(1);

    expect(screen.getByTestId("cell-thumb-0")).toHaveAttribute(
      "tabIndex",
      "-1",
    );
    expect(screen.getByTestId("cell-thumb-1")).toHaveAttribute("tabIndex", "0");
    expect(screen.getByTestId("cell-thumb-2")).toHaveAttribute(
      "tabIndex",
      "-1",
    );
    expect(screen.getByTestId("cell-thumb-3")).toHaveAttribute(
      "tabIndex",
      "-1",
    );
  });

  it("when no cell is selected yet, the first cell is the tab stop but reads as unchecked", () => {
    setup(null);

    const first = screen.getByTestId("cell-thumb-0");
    expect(first).toHaveAttribute("tabIndex", "0");
    // Critical: the tab-stop seed must NOT lie about selection state.
    expect(first).toHaveAttribute("aria-checked", "false");
    for (const thumb of screen.getAllByRole("radio")) {
      expect(thumb).toHaveAttribute("aria-checked", "false");
    }
  });

  it("ArrowRight on the focused cell selects the next cell and moves focus there", () => {
    const { onSelect } = setup(1);

    const second = screen.getByTestId("cell-thumb-1");
    second.focus();
    fireEvent.keyDown(second, { key: "ArrowRight" });

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("ArrowLeft wraps from the first cell to the last", () => {
    const { onSelect } = setup(0);

    const first = screen.getByTestId("cell-thumb-0");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });

    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("End jumps to the last cell, Home to the first", () => {
    const { onSelect } = setup(1);

    const second = screen.getByTestId("cell-thumb-1");
    second.focus();
    fireEvent.keyDown(second, { key: "End" });
    expect(onSelect).toHaveBeenLastCalledWith(3);

    fireEvent.keyDown(second, { key: "Home" });
    expect(onSelect).toHaveBeenLastCalledWith(0);
  });

  it("clicking a thumb selects it via onSelect with the numeric index", () => {
    const { onSelect } = setup(0);

    fireEvent.click(screen.getByTestId("cell-thumb-2"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
