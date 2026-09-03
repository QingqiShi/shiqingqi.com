import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
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
  it("renders a slider named by its label", () => {
    render(<Slider label="Salary" />);

    expect(screen.getByRole("slider", { name: "Salary" })).toBeInTheDocument();
  });

  it("puts the accessible name on the input, not on a wrapper", () => {
    render(<Slider label="Salary" />);

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Salary" }).tagName).toBe(
      "INPUT",
    );
  });

  it("keeps the accessible name when the label is visually hidden", () => {
    render(<Slider label="Salary" labelHidden />);

    expect(screen.getByRole("slider", { name: "Salary" })).toBeInTheDocument();
  });

  it("exposes the range to assistive technology", () => {
    render(<Slider label="Salary" min={1000} max={9000} step={500} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    expect(slider).toHaveAttribute("type", "range");
    expect(slider).toHaveAttribute("min", "1000");
    expect(slider).toHaveAttribute("max", "9000");
    expect(slider).toHaveAttribute("step", "500");
  });

  it("starts at min when no value is given", () => {
    render(<Slider label="Salary" min={1000} max={9000} />);

    expect(screen.getByRole("slider", { name: "Salary" })).toHaveValue("1000");
  });

  it("starts at defaultValue when uncontrolled", () => {
    render(<Slider label="Salary" min={0} max={100} defaultValue={30} />);

    expect(screen.getByRole("slider", { name: "Salary" })).toHaveValue("30");
  });

  it("tracks its own value when uncontrolled", () => {
    render(<Slider label="Salary" min={0} max={100} defaultValue={30} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    drag(slider, 55);

    expect(slider).toHaveValue("55");
  });

  it("renders the value the parent owns when controlled", () => {
    function Controlled() {
      const [value, setValue] = useState(20);
      return (
        <>
          <Slider label="Salary" value={value} onChange={setValue} />
          <button
            onClick={() => {
              setValue(80);
            }}
          >
            Jump
          </button>
        </>
      );
    }

    render(<Controlled />);
    const slider = screen.getByRole("slider", { name: "Salary" });
    expect(slider).toHaveValue("20");

    drag(slider, 45);
    expect(slider).toHaveValue("45");

    fireEvent.click(screen.getByRole("button", { name: "Jump" }));
    expect(slider).toHaveValue("80");
  });

  it("holds its value when a controlled parent rejects the change", () => {
    const onChange = vi.fn();
    render(<Slider label="Salary" value={20} onChange={onChange} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    drag(slider, 45);

    expect(onChange).toHaveBeenCalledWith(45);
    expect(slider).toHaveValue("20");
  });

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

  it("does not call onCommit while the pointer is still down", () => {
    const onCommit = vi.fn();
    render(<Slider label="Salary" min={0} max={100} onCommit={onCommit} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: "10" } });
    fireEvent.change(slider, { target: { value: "20" } });

    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(slider);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("does not call onCommit when an interaction moved nothing", () => {
    const onCommit = vi.fn();
    render(<Slider label="Salary" min={0} max={100} onCommit={onCommit} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    fireEvent.pointerDown(slider);
    fireEvent.pointerUp(slider);
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyUp(slider, { key: "ArrowRight" });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commits a keyboard step when the key is released", () => {
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

    pressKey(screen.getByRole("slider", { name: "Salary" }), "ArrowRight", 1);

    expect(onChange.mock.calls).toEqual([[1]]);
    expect(onCommit.mock.calls).toEqual([[1]]);
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

  it("leaves arrow-key stepping to the browser", () => {
    render(<Slider label="Salary" min={0} max={100} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    // `fireEvent` returns false when a handler called `preventDefault`, which
    // would suppress the platform's own stepping.
    expect(fireEvent.keyDown(slider, { key: "ArrowRight" })).toBe(true);
    expect(fireEvent.keyDown(slider, { key: "PageUp" })).toBe(true);
    expect(fireEvent.keyDown(slider, { key: "End" })).toBe(true);
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

  it("still forwards the handlers it composes with", () => {
    const onPointerUp = vi.fn();
    const onKeyUp = vi.fn();
    const onBlur = vi.fn();
    render(
      <Slider
        label="Salary"
        onPointerUp={onPointerUp}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Salary" });
    fireEvent.pointerUp(slider);
    fireEvent.keyUp(slider, { key: "ArrowRight" });
    fireEvent.blur(slider);

    expect(onPointerUp).toHaveBeenCalledTimes(1);
    expect(onKeyUp).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("respects the disabled prop", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <Slider
        label="Salary"
        disabled
        onChange={onChange}
        onCommit={onCommit}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Salary" });
    expect(slider).toBeDisabled();

    fireEvent.pointerDown(slider);
    fireEvent.pointerUp(slider);
    expect(onChange).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("marks the field invalid and describes it when error is set", () => {
    render(<Slider label="Salary" error="Pick a salary above zero" />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    expect(slider).toHaveAttribute("aria-invalid", "true");

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Pick a salary above zero");
    expect(slider.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("does not mark a valid field invalid", () => {
    render(<Slider label="Salary" />);

    expect(screen.getByRole("slider", { name: "Salary" })).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  it("wires the description via aria-describedby", () => {
    render(<Slider label="Salary" description="Before tax" />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    const description = screen.getByText("Before tax");
    expect(slider.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("renders the readout slot beside the label", () => {
    render(<Slider label="Salary" readout={<span>£32,000</span>} />);

    expect(screen.getByText("£32,000")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Salary" })).toBeInTheDocument();
  });

  it("applies distinct classes per size", () => {
    const { container: sm } = render(<Slider label="A" size="sm" />);
    const { container: lg } = render(<Slider label="B" size="lg" />);

    expect(sm.querySelector("input")?.className).not.toBe(
      lg.querySelector("input")?.className,
    );
  });

  it("forwards native attributes and a ref to the input", () => {
    const ref: { current: HTMLInputElement | null } = { current: null };
    render(<Slider label="Salary" name="salary" ref={ref} />);

    const slider = screen.getByRole("slider", { name: "Salary" });
    expect(slider).toHaveAttribute("name", "salary");
    expect(ref.current).toBe(slider);
  });
});
