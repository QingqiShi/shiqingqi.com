import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Callout } from "./callout.tsx";

describe("Callout dismiss", () => {
  it("names the dismiss button with dismissLabel and fires onDismiss", () => {
    const onDismiss = vi.fn();
    render(
      <Callout intent="warning" onDismiss={onDismiss} dismissLabel="Dismiss">
        Careful now.
      </Callout>,
    );
    const region = screen.getByRole("alert");
    const button = within(region).getByRole("button", { name: "Dismiss" });
    fireEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
