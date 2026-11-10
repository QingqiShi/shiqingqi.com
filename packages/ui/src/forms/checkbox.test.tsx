import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./checkbox.tsx";

describe("Checkbox", () => {
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

    await user.click(screen.getByText("Accept terms"));

    expect(
      screen.getByRole("checkbox", { name: "Accept terms" }),
    ).toBeChecked();
  });

  it("keeps its state when read-only, stays reachable, and says so", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Renew passport" readOnly defaultChecked />);

    const checkbox = screen.getByRole("checkbox", { name: "Renew passport" });
    await user.tab();
    expect(checkbox).toHaveFocus();
    await user.keyboard(" ");
    await user.click(checkbox);
    await user.click(screen.getByText("Renew passport"));

    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAttribute("aria-readonly", "true");
  });
});
