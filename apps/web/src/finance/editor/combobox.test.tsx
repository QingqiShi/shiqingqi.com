import { useState, type KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/testing/test-utils.tsx";
import { Combobox, type ComboboxOption } from "./combobox.tsx";

const PAYEES: ComboboxOption[] = [
  { id: "1", label: "Tesco" },
  { id: "2", label: "Tesco Express", detail: "Groceries" },
  { id: "3", label: "Ocado" },
];

function Harness({
  onSelect,
  onKeyDown,
}: {
  onSelect: (option: ComboboxOption) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [value, setValue] = useState("");
  const options = PAYEES.filter((option) =>
    option.label.toLowerCase().startsWith(value.trim().toLowerCase()),
  );
  return (
    <Combobox
      label="Payee"
      value={value}
      onValueChange={setValue}
      options={options}
      onSelect={(option) => {
        setValue(option.label);
        onSelect(option);
      }}
      createLabel={(text) => `New payee “${text}”`}
      onKeyDown={onKeyDown}
    />
  );
}

function setup() {
  const onSelect = vi.fn();
  const onKeyDown = vi.fn((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onEnter();
  });
  const onEnter = vi.fn();
  render(<Harness onSelect={onSelect} onKeyDown={onKeyDown} />);
  return { onSelect, onEnter, input: screen.getByRole("combobox") };
}

describe("Combobox", () => {
  it("wires the listbox and the active option for assistive technology", async () => {
    const { input } = setup();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    const listbox = screen.getByRole("listbox", { hidden: true });
    expect(input).toHaveAttribute("aria-controls", listbox.id);

    await userEvent.type(input, "tes");
    expect(input).toHaveAttribute("aria-expanded", "true");
    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Tesco",
      "Tesco ExpressGroceries",
      "New payee “tes”",
    ]);
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
    await userEvent.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", options[2].id);
  });

  it("picks the active option with Enter and passes the next Enter on", async () => {
    const { input, onSelect, onEnter } = setup();
    await userEvent.type(input, "oc{Enter}");
    expect(onSelect).toHaveBeenCalledWith(PAYEES[2]);
    expect(input).toHaveValue("Ocado");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onEnter).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape without picking, and offers a new name", async () => {
    const { input, onSelect } = setup();
    await userEvent.type(input, "Waitrose");
    expect(screen.getByRole("option")).toHaveTextContent(
      "New payee “Waitrose”",
    );
    await userEvent.keyboard("{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("Waitrose");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("picks with the pointer and keeps focus in the field", async () => {
    const { input, onSelect } = setup();
    await userEvent.click(input);
    await userEvent.type(input, "t");
    await userEvent.click(screen.getByRole("option", { name: /Express/ }));
    expect(onSelect).toHaveBeenCalledWith(PAYEES[1]);
    expect(input).toHaveFocus();
  });
});
