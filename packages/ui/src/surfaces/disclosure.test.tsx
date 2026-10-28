import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Disclosure } from "./disclosure.tsx";

describe("Disclosure", () => {
  it("reveals the panel on click and collapses it again", async () => {
    const user = userEvent.setup();
    render(<Disclosure summary="Packing list">Passport</Disclosure>);
    expect(screen.getByText("Passport")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Packing list" }));
    expect(screen.getByText("Passport")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Packing list" }));
    expect(screen.getByText("Passport")).not.toBeVisible();
  });
});
