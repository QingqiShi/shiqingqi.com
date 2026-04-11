import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { SessionRestoreBanner } from "./session-restore-banner";

describe("SessionRestoreBanner", () => {
  it("shows the default prompt and both action buttons in the idle state", () => {
    render(<SessionRestoreBanner onContinue={() => {}} onDismiss={() => {}} />);

    expect(
      screen.getByText("You have a previous conversation"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeEnabled();
  });

  it("fires onContinue when the continue button is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <SessionRestoreBanner onContinue={onContinue} onDismiss={() => {}} />,
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("fires onDismiss when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <SessionRestoreBanner onContinue={() => {}} onDismiss={onDismiss} />,
    );

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons and shows the pending label while a restore is in flight", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onDismiss = vi.fn();
    render(
      <SessionRestoreBanner
        onContinue={onContinue}
        onDismiss={onDismiss}
        isPending
      />,
    );

    const continueButton = screen.getByRole("button", { name: "Continuing…" });
    const dismissButton = screen.getByRole("button", { name: "Dismiss" });

    expect(continueButton).toBeDisabled();
    expect(continueButton).toHaveAttribute("aria-busy", "true");
    expect(dismissButton).toBeDisabled();

    // Rapid-click dedupe: disabled buttons don't fire handlers, which is the
    // point — the hook's in-flight guard is belt-and-braces on top of this.
    await user.click(continueButton);
    await user.click(dismissButton);
    expect(onContinue).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("shows an error message and a Try again label when the restore fails", () => {
    render(
      <SessionRestoreBanner
        onContinue={() => {}}
        onDismiss={() => {}}
        hasError
      />,
    );

    expect(
      screen.getByText(
        "Couldn't restore that conversation. Try again or dismiss.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeEnabled();
  });

  it("surfaces the error as a live region so screen readers announce it", () => {
    render(
      <SessionRestoreBanner
        onContinue={() => {}}
        onDismiss={() => {}}
        hasError
      />,
    );

    // role=alert makes SR announce the failure without the user having to
    // re-focus the banner. Without this the failure would be silent for
    // assistive-tech users the same way it was silent for sighted ones.
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("lets the user retry after an error by clicking Try again", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <SessionRestoreBanner
        onContinue={onContinue}
        onDismiss={() => {}}
        hasError
      />,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
