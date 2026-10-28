import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useRadioGroup } from "./use-radio-group.ts";

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

  it("ArrowRight wraps around from the last option to the first", () => {
    render(<Harness initial="d" />);

    const d = screen.getByTestId("option-d");
    d.focus();
    fireEvent.keyDown(d, { key: "ArrowRight" });

    const a = screen.getByTestId("option-a");
    expect(a).toHaveAttribute("aria-checked", "true");
    expect(a).toHaveFocus();
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
});
