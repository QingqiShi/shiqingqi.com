import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useRadioGroup } from "./use-radio-group";

const VALUES = ["a", "b", "c", "d"] as const;
type Value = (typeof VALUES)[number];

function Harness({ initial = "a" }: { initial?: Value }) {
  const [value, setValue] = useState<Value>(initial);
  const { getOptionProps } = useRadioGroup({
    values: VALUES,
    value,
    onChange: setValue,
  });

  return (
    <div role="radiogroup" aria-label="test group">
      {VALUES.map((v) => (
        <button
          key={v}
          type="button"
          {...getOptionProps(v)}
          data-testid={`option-${v}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

describe("useRadioGroup", () => {
  it("marks each option with role=radio and aria-checked reflecting the active value", () => {
    render(<Harness initial="b" />);

    const a = screen.getByTestId("option-a");
    const b = screen.getByTestId("option-b");

    expect(a).toHaveAttribute("role", "radio");
    expect(b).toHaveAttribute("role", "radio");
    expect(a).toHaveAttribute("aria-checked", "false");
    expect(b).toHaveAttribute("aria-checked", "true");
  });

  it("rolls tabIndex so only the active option is in the tab sequence", () => {
    render(<Harness initial="c" />);

    expect(screen.getByTestId("option-a")).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByTestId("option-b")).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByTestId("option-c")).toHaveAttribute("tabIndex", "0");
    expect(screen.getByTestId("option-d")).toHaveAttribute("tabIndex", "-1");
  });

  it("clicking an option updates aria-checked + tabIndex", () => {
    render(<Harness initial="a" />);

    fireEvent.click(screen.getByTestId("option-c"));

    expect(screen.getByTestId("option-a")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByTestId("option-c")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("option-c")).toHaveAttribute("tabIndex", "0");
  });

  it("ArrowRight / ArrowDown move selection forward and focus the new option", () => {
    render(<Harness initial="b" />);

    const b = screen.getByTestId("option-b");
    b.focus();
    fireEvent.keyDown(b, { key: "ArrowRight" });

    const c = screen.getByTestId("option-c");
    expect(c).toHaveAttribute("aria-checked", "true");
    expect(c).toHaveFocus();

    fireEvent.keyDown(c, { key: "ArrowDown" });

    const d = screen.getByTestId("option-d");
    expect(d).toHaveAttribute("aria-checked", "true");
    expect(d).toHaveFocus();
  });

  it("ArrowLeft / ArrowUp move selection backward", () => {
    render(<Harness initial="c" />);

    const c = screen.getByTestId("option-c");
    c.focus();
    fireEvent.keyDown(c, { key: "ArrowLeft" });

    const b = screen.getByTestId("option-b");
    expect(b).toHaveAttribute("aria-checked", "true");
    expect(b).toHaveFocus();

    fireEvent.keyDown(b, { key: "ArrowUp" });

    const a = screen.getByTestId("option-a");
    expect(a).toHaveAttribute("aria-checked", "true");
    expect(a).toHaveFocus();
  });

  it("ArrowRight wraps around from the last option to the first", () => {
    render(<Harness initial="d" />);

    const d = screen.getByTestId("option-d");
    d.focus();
    fireEvent.keyDown(d, { key: "ArrowRight" });

    const a = screen.getByTestId("option-a");
    expect(a).toHaveAttribute("aria-checked", "true");
    expect(a).toHaveFocus();
  });

  it("ArrowLeft wraps around from the first option to the last", () => {
    render(<Harness initial="a" />);

    const a = screen.getByTestId("option-a");
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowLeft" });

    const d = screen.getByTestId("option-d");
    expect(d).toHaveAttribute("aria-checked", "true");
    expect(d).toHaveFocus();
  });

  it("Home jumps to the first option, End jumps to the last", () => {
    render(<Harness initial="b" />);

    const b = screen.getByTestId("option-b");
    b.focus();
    fireEvent.keyDown(b, { key: "End" });

    const d = screen.getByTestId("option-d");
    expect(d).toHaveAttribute("aria-checked", "true");
    expect(d).toHaveFocus();

    fireEvent.keyDown(d, { key: "Home" });

    const a = screen.getByTestId("option-a");
    expect(a).toHaveAttribute("aria-checked", "true");
    expect(a).toHaveFocus();
  });

  it("ignores unrelated keys", () => {
    render(<Harness initial="b" />);

    const b = screen.getByTestId("option-b");
    b.focus();
    fireEvent.keyDown(b, { key: "Tab" });
    fireEvent.keyDown(b, { key: "a" });

    expect(b).toHaveAttribute("aria-checked", "true");
  });
});
