import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "./combobox.tsx";

const ZONES = ["Abidjan", "Lisbon", "London", "Tokyo"].map((city) => ({
  id: city,
  label: city,
}));

/** A picker that gives every zone only on focus, as a long list does to save a slow phone the work. */
function TimeZoneField() {
  const [zones, setZones] = useState(ZONES.filter(({ id }) => id === "London"));
  return (
    <Combobox
      label="Time zone"
      options={zones}
      defaultSelected="London"
      onFocus={() => {
        setZones(ZONES);
      }}
    />
  );
}

describe("Combobox", () => {
  it("opens at the picked option when the options come on focus", async () => {
    const user = userEvent.setup();
    render(<TimeZoneField />);
    const field = screen.getByRole("combobox", { name: "Time zone" });

    await user.click(field);

    const active = field.getAttribute("aria-activedescendant");
    expect(active && document.getElementById(active)).toHaveTextContent(
      "London",
    );
  });

  it("replaces the picked option's text with what a second tap types", async () => {
    const user = userEvent.setup();
    render(<TimeZoneField />);
    const field = screen.getByRole("combobox", { name: "Time zone" });

    await user.click(field);
    await user.click(field);
    await user.keyboard("Tok");

    expect(field).toHaveValue("Tok");
  });

  it("does not send the form with the old pick when a search finds nothing", async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    render(
      <form onSubmit={submit}>
        <TimeZoneField />
      </form>,
    );

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("Kyoto{Enter}");

    expect(submit).not.toHaveBeenCalled();
  });
});
