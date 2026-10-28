import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./select.tsx";

const FRUIT = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
];

describe("Select", () => {
  it("fires onChange and updates the value when a choice is made", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Select label="Fruit" options={FRUIT} onChange={handleChange} />);

    const select = screen.getByRole("combobox", { name: "Fruit" });
    await user.selectOptions(select, "banana");

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(select).toHaveValue("banana");
  });
});
