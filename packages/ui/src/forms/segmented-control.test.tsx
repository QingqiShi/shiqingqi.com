import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./segmented-control.tsx";

const OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "overview", label: "Overview" },
] as const;

function Harness() {
  const [value, setValue] = useState<"daily" | "overview">("daily");
  return (
    <SegmentedControl
      aria-label="View"
      options={OPTIONS}
      value={value}
      onChange={setValue}
    />
  );
}

describe("SegmentedControl", () => {
  it("selects an option on click", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("radio", { name: "Overview" }));

    expect(screen.getByRole("radio", { name: "Overview" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("moves selection with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Daily" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: "Overview" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Overview" })).toHaveFocus();
  });

  it("does not submit an enclosing form", () => {
    render(
      <form>
        <SegmentedControl
          aria-label="View"
          options={OPTIONS}
          value="daily"
          onChange={vi.fn()}
        />
      </form>,
    );

    // Without an explicit type a <button> defaults to type="submit", so picking
    // a view would reload the page and lose the form's contents.
    for (const segment of screen.getAllByRole("radio")) {
      expect(segment).toHaveAttribute("type", "button");
    }
  });

  it("stays reachable by keyboard when the value matches no option", async () => {
    const user = userEvent.setup();
    // Widened to `string` so the drifted value is expressible — which is the
    // shape a value read from a query param arrives in anyway.
    const options = [
      { value: "daily", label: "Daily" },
      { value: "overview", label: "Overview" },
    ];
    render(
      <SegmentedControl
        aria-label="View"
        options={options}
        value="table"
        onChange={vi.fn()}
      />,
    );

    await user.tab();
    expect(screen.getAllByRole("radio")[0]).toHaveFocus();
  });

  it("calls onChange with the same value when clicking the already-selected segment", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="View"
        options={OPTIONS}
        value="daily"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Daily" }));

    expect(onChange).toHaveBeenCalledWith("daily");
  });
});
