import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./select.tsx";

const FRUIT = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry", disabled: true },
];

describe("Select", () => {
  it("renders a combobox named by its label", () => {
    render(<Select label="Fruit" options={FRUIT} />);

    expect(screen.getByRole("combobox", { name: "Fruit" })).toBeInTheDocument();
  });

  it("keeps the accessible name when the label is visually hidden", () => {
    render(<Select label="Fruit" labelHidden options={FRUIT} />);

    expect(screen.getByRole("combobox", { name: "Fruit" })).toBeInTheDocument();
  });

  it("renders options from the options prop", () => {
    render(<Select label="Fruit" options={FRUIT} />);

    expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Cherry" })).toBeDisabled();
  });

  it("renders options from children as an escape hatch", () => {
    render(
      <Select label="Fruit">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
      </Select>,
    );

    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
  });

  it("fires onChange and updates the value when a choice is made", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Select label="Fruit" options={FRUIT} onChange={handleChange} />);

    const select = screen.getByRole("combobox", { name: "Fruit" });
    await user.selectOptions(select, "banana");

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(select).toHaveValue("banana");
  });

  it("works as a controlled select", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState("apple");
      return (
        <Select
          label="Fruit"
          options={FRUIT}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      );
    }

    render(<Controlled />);
    const select = screen.getByRole("combobox", { name: "Fruit" });
    expect(select).toHaveValue("apple");

    await user.selectOptions(select, "banana");
    expect(select).toHaveValue("banana");
  });

  it("renders a disabled placeholder that is selected by default", () => {
    render(
      <Select label="Fruit" placeholder="Choose a fruit" options={FRUIT} />,
    );

    const placeholder = screen.getByText("Choose a fruit");
    expect(placeholder.tagName).toBe("OPTION");
    expect(placeholder).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveValue("");
  });

  it("marks the field invalid and describes it when error is set", () => {
    render(<Select label="Fruit" options={FRUIT} error="Pick something" />);

    const select = screen.getByRole("combobox", { name: "Fruit" });
    expect(select).toHaveAttribute("aria-invalid", "true");

    const message = screen.getByText("Pick something");
    expect(select.getAttribute("aria-describedby")).toContain(message.id);
  });

  it("announces the error as an alert", () => {
    render(<Select label="Fruit" options={FRUIT} error="Pick something" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Pick something");
    expect(
      screen
        .getByRole("combobox", { name: "Fruit" })
        .getAttribute("aria-describedby"),
    ).toContain(alert.id);
  });

  it("wires the description via aria-describedby", () => {
    render(
      <Select
        label="Fruit"
        options={FRUIT}
        description="Your favourite fruit"
      />,
    );

    const select = screen.getByRole("combobox", { name: "Fruit" });
    const description = screen.getByText("Your favourite fruit");
    expect(select.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("does not mark a valid field invalid", () => {
    render(<Select label="Fruit" options={FRUIT} />);

    expect(screen.getByRole("combobox", { name: "Fruit" })).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  it("respects the disabled prop", () => {
    render(<Select label="Fruit" options={FRUIT} disabled />);

    expect(screen.getByRole("combobox", { name: "Fruit" })).toBeDisabled();
  });

  it("forwards native attributes to the select", () => {
    render(<Select label="Fruit" options={FRUIT} name="fruit" />);

    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveAttribute(
      "name",
      "fruit",
    );
  });

  it("forwards a ref to the select element", () => {
    const ref: { current: HTMLSelectElement | null } = { current: null };
    render(<Select label="Fruit" options={FRUIT} ref={ref} />);

    expect(ref.current?.tagName).toBe("SELECT");
  });
});
