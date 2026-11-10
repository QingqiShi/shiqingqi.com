import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubObservers } from "../test-support/stub-observers.ts";
import { Slider } from "./slider.tsx";

// jsdom implements no activation behaviour for `<input type="range">`: no
// arrow key moves the value, so nothing dispatches the `input`/`change` events
// a browser would. This helper replays the exact event sequence Chromium was
// observed to emit, so the component's own contract — what it does *given*
// those events — is what gets tested. jsdom lays nothing out, so a pointer
// drag, which reads the groove's width, is left to the browser.
function pressKey(slider: HTMLElement, key: string, ...values: number[]) {
  for (const value of values) {
    fireEvent.keyDown(slider, { key });
    fireEvent.change(slider, { target: { value: String(value) } });
  }
  fireEvent.keyUp(slider, { key });
}

describe("Slider", () => {
  beforeEach(() => {
    stubObservers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls onChange with a number on every step", () => {
    const onChange = vi.fn();
    render(<Slider label="Salary" min={0} max={100} onChange={onChange} />);

    pressKey(
      screen.getByRole("slider", { name: "Salary" }),
      "ArrowRight",
      10,
      20,
      30,
    );

    expect(onChange.mock.calls).toEqual([[10], [20], [30]]);
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

  it("does not commit twice when a key release is followed by a blur", () => {
    const onCommit = vi.fn();
    render(<Slider label="Salary" min={0} max={100} onCommit={onCommit} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    pressKey(slider, "ArrowRight", 40);
    fireEvent.blur(slider);

    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
