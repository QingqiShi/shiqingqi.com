import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Popover } from "./popover.tsx";

function TestPopover() {
  return (
    <Popover
      trigger={(triggerProps) => <button {...triggerProps}>Open panel</button>}
    >
      <button type="button">Inside</button>
    </Popover>
  );
}

function getTrigger() {
  return screen.getByRole("button", { name: "Open panel" });
}

describe("Popover", () => {
  it("opens from the trigger and exposes the content as a dialog", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(getTrigger());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();
  });

  it("moves focus into the popover on open", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    await user.click(getTrigger());

    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    const trigger = getTrigger();
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("closes when a pointer lands outside it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestPopover />
        <button type="button">Elsewhere</button>
      </>,
    );

    await user.click(getTrigger());
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes again when the trigger is activated a second time", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    const trigger = getTrigger();
    await user.click(trigger);
    await user.click(trigger);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
