import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox.tsx";

describe("Checkbox", () => {
  it("renders a checkbox named by its label", () => {
    render(<Checkbox label="Accept terms" />);

    expect(
      screen.getByRole("checkbox", { name: "Accept terms" }),
    ).toBeInTheDocument();
  });

  it("keeps the accessible name when the label is visually hidden", () => {
    render(<Checkbox label="Select row" labelHidden />);

    expect(
      screen.getByRole("checkbox", { name: "Select row" }),
    ).toBeInTheDocument();
  });

  it("toggles when the box is clicked", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Accept terms" />);

    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("toggles when the label text is clicked", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Accept terms" />);

    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).not.toBeChecked();

    await user.click(screen.getByText("Accept terms"));
    expect(checkbox).toBeChecked();
  });

  it("calls onChange with the native event on toggle", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox label="Accept terms" onChange={handleChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Accept terms" }));

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("works as a controlled checkbox", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          label="Accept terms"
          checked={checked}
          onChange={(event) => {
            setChecked(event.target.checked);
          }}
        />
      );
    }

    render(<Controlled />);
    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });

    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("reflects the indeterminate prop onto the DOM node", () => {
    render(<Checkbox label="Select all" indeterminate />);

    const checkbox = screen.getByRole("checkbox", { name: "Select all" });
    expect(checkbox).toHaveProperty("indeterminate", true);
  });

  it("clears indeterminate when the prop is false", () => {
    const { rerender } = render(<Checkbox label="Select all" indeterminate />);
    const checkbox = screen.getByRole("checkbox", { name: "Select all" });
    expect(checkbox).toHaveProperty("indeterminate", true);

    rerender(<Checkbox label="Select all" indeterminate={false} />);
    expect(checkbox).toHaveProperty("indeterminate", false);
  });

  it("marks the field invalid and describes it when error is set", () => {
    render(<Checkbox label="Accept terms" error="You must accept" />);

    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).toHaveAttribute("aria-invalid", "true");

    const message = screen.getByText("You must accept");
    expect(checkbox.getAttribute("aria-describedby")).toContain(message.id);
  });

  it("wires the description via aria-describedby", () => {
    render(
      <Checkbox label="Subscribe" description="We send one email a week" />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Subscribe" });
    const description = screen.getByText("We send one email a week");
    expect(checkbox.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("does not mark a valid field invalid", () => {
    render(<Checkbox label="Accept terms" />);

    expect(
      screen.getByRole("checkbox", { name: "Accept terms" }),
    ).not.toHaveAttribute("aria-invalid");
  });

  it("respects the disabled prop", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox label="Accept terms" disabled onChange={handleChange} />);

    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).toBeDisabled();

    await user.click(checkbox);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("forwards native attributes to the input", () => {
    render(<Checkbox label="Accept terms" name="terms" value="yes" />);

    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).toHaveAttribute("name", "terms");
    expect(checkbox).toHaveAttribute("value", "yes");
  });

  it("forwards a ref to the input element", () => {
    const ref: { current: HTMLInputElement | null } = { current: null };
    render(<Checkbox label="Accept terms" ref={ref} />);

    expect(ref.current?.tagName).toBe("INPUT");
    expect(ref.current?.type).toBe("checkbox");
  });
});
