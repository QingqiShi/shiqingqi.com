import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "./slider.tsx";

// jsdom implements no activation behaviour for `<input type="range">`: neither a
// pointer drag nor an arrow key moves the value, so nothing dispatches the
// `input`/`change` events a browser would. These helpers replay the exact event
// sequences Chromium was observed to emit, so the component's own contract —
// what it does *given* those events — is what gets tested.
function drag(slider: HTMLElement, ...values: number[]) {
  fireEvent.pointerDown(slider);
  for (const value of values) {
    fireEvent.change(slider, { target: { value: String(value) } });
  }
  fireEvent.pointerUp(slider);
}

function pressKey(slider: HTMLElement, key: string, ...values: number[]) {
  for (const value of values) {
    fireEvent.keyDown(slider, { key });
    fireEvent.change(slider, { target: { value: String(value) } });
  }
  fireEvent.keyUp(slider, { key });
}

describe("Slider", () => {
  it("calls onChange with a number on every move", () => {
    const onChange = vi.fn();
    render(<Slider label="Salary" min={0} max={100} onChange={onChange} />);

    drag(screen.getByRole("slider", { name: "Salary" }), 10, 20, 30);

    expect(onChange.mock.calls).toEqual([[10], [20], [30]]);
  });

  it("calls onCommit once per pointer interaction, not per move", () => {
    const onCommit = vi.fn();
    render(<Slider label="Salary" min={0} max={100} onCommit={onCommit} />);

    drag(screen.getByRole("slider", { name: "Salary" }), 10, 20, 30);

    expect(onCommit.mock.calls).toEqual([[30]]);
  });

  it("commits once when a held key auto-repeats", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <Slider
        label="Salary"
        min={0}
        max={100}
        onChange={onChange}
        onCommit={onCommit}
      />,
    );

    pressKey(
      screen.getByRole("slider", { name: "Salary" }),
      "ArrowRight",
      1,
      2,
      3,
    );

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onCommit.mock.calls).toEqual([[3]]);
  });

  it("commits a pending value when focus leaves mid-interaction", () => {
    const onCommit = vi.fn();
    render(<Slider label="Salary" min={0} max={100} onCommit={onCommit} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.change(slider, { target: { value: "1" } });
    fireEvent.blur(slider);

    expect(onCommit.mock.calls).toEqual([[1]]);
  });

  it("does not commit twice when a release is followed by a blur", () => {
    const onCommit = vi.fn();
    render(<Slider label="Salary" min={0} max={100} onCommit={onCommit} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    drag(slider, 40);
    fireEvent.blur(slider);

    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
