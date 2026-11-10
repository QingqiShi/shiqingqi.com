import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusDot } from "./status-dot.tsx";

describe("StatusDot", () => {
  it("adds its label to the name of the control it sits in", () => {
    render(
      <a href="/settings/mailboxes">
        Mailboxes <StatusDot intent="warning" label="needs connecting again" />
      </a>,
    );
    expect(
      screen.getByRole("link", { name: "Mailboxes needs connecting again" }),
    ).toBeInTheDocument();
  });

  it("is hidden from assistive tech without a label", () => {
    render(
      <a href="/settings">
        Settings
        <StatusDot intent="warning" data-testid="dot" />
      </a>,
    );
    expect(screen.getByTestId("dot")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});
