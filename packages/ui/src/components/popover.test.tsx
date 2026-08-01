import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Popover } from "./popover.tsx";

// jsdom has no layout engine, so nothing here asserts pixel placement — the
// placement maths is covered as a pure function in `use-popover.test.ts`.

interface TestPopoverProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  "aria-label"?: string;
  portalTarget?: Element | DocumentFragment | null;
}

/** The uncontrolled shape. Controlled tests render `Popover` directly. */
function TestPopover({ children, ...props }: TestPopoverProps) {
  return (
    <Popover
      trigger={(triggerProps) => <button {...triggerProps}>Open panel</button>}
      {...props}
    >
      {children ?? <button type="button">Inside</button>}
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

  it("names the popover by its trigger", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    await user.click(getTrigger());

    expect(
      screen.getByRole("dialog", { name: "Open panel" }),
    ).toBeInTheDocument();
  });

  it("lets aria-label override the trigger as the name", async () => {
    const user = userEvent.setup();
    render(<TestPopover aria-label="Repayment sources" />);

    await user.click(getTrigger());

    const dialog = screen.getByRole("dialog", { name: "Repayment sources" });
    expect(dialog).not.toHaveAttribute("aria-labelledby");
  });

  it("wires aria-expanded, aria-haspopup and aria-controls on the trigger", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    const trigger = getTrigger();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    // Nothing to control while the popover is unmounted.
    expect(trigger).not.toHaveAttribute("aria-controls");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const controlsId = trigger.getAttribute("aria-controls") ?? "";
    expect(controlsId).not.toBe("");
    expect(document.getElementById(controlsId)).toBe(
      screen.getByRole("dialog"),
    );
  });

  it("moves focus into the popover on open", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    await user.click(getTrigger());

    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
  });

  it("focuses the popover itself when it holds nothing focusable", async () => {
    const user = userEvent.setup();
    render(<TestPopover>Source: Student Loans Company</TestPopover>);

    await user.click(getTrigger());

    expect(screen.getByRole("dialog")).toHaveFocus();
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

  it("stays open while pointers land inside it", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    await user.click(getTrigger());
    await user.click(screen.getByRole("button", { name: "Inside" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes again when the trigger is activated a second time", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    const trigger = getTrigger();
    await user.click(trigger);
    await user.click(trigger);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when focus moves to an element outside it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestPopover />
        <button type="button">Elsewhere</button>
      </>,
    );

    await user.click(getTrigger());
    // Focus moved by something other than a pointer — a script, a skip link, or
    // a Tab that landed outside the portalled popover.
    act(() => {
      screen.getByRole("button", { name: "Elsewhere" }).focus();
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes when focus leaves from the trigger rather than the content", async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestPopover />
        <button type="button">Elsewhere</button>
      </>,
    );

    const trigger = getTrigger();
    await user.click(trigger);

    // Shift-tabbing out of a portalled popup lands back on the trigger, which is
    // still part of the popover — dismissal has to survive that round trip.
    act(() => {
      trigger.focus();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "Elsewhere" }).focus();
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not trap focus", async () => {
    const user = userEvent.setup();
    render(
      <TestPopover>
        <button type="button">First</button>
        <button type="button">Last</button>
      </TestPopover>,
    );

    await user.click(getTrigger());
    const dialog = screen.getByRole("dialog");
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();

    // Past the last control focus leaves the popover instead of cycling back to
    // the first, which is what a focus trap (`Overlay`) would do.
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(false);
  });

  it("does not lock page scroll", async () => {
    const user = userEvent.setup();
    render(<TestPopover />);

    await user.click(getTrigger());

    expect(document.body.style.overflow).toBe("");
  });

  it("respects the controlled open state", async () => {
    const user = userEvent.setup();
    // A parent that ignores `onOpenChange` must keep the popover open — the
    // component may never fall back to state of its own while controlled.
    render(
      <Popover
        open
        onOpenChange={() => undefined}
        trigger={(triggerProps) => (
          <button {...triggerProps}>Open panel</button>
        )}
      >
        <button type="button">Inside</button>
      </Popover>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(getTrigger());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("reports every state change to a controlling parent", async () => {
    const user = userEvent.setup();
    const changes: boolean[] = [];

    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <Popover
          open={open}
          onOpenChange={(next) => {
            changes.push(next);
            setOpen(next);
          }}
          trigger={(triggerProps) => (
            <button {...triggerProps}>Open panel</button>
          )}
        >
          <button type="button">Inside</button>
        </Popover>
      );
    }

    render(<Controlled />);

    await user.click(getTrigger());
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(changes).toEqual([true, false]);
  });

  it("opens from defaultOpen when uncontrolled", () => {
    render(<TestPopover defaultOpen />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders into an explicit portal target", async () => {
    const user = userEvent.setup();
    const target = document.createElement("div");
    document.body.append(target);

    render(<TestPopover portalTarget={target} />);
    await user.click(getTrigger());

    expect(target).toContainElement(screen.getByRole("dialog"));

    target.remove();
  });

  it("holds off rendering until a portal target arrives", async () => {
    const user = userEvent.setup();
    render(<TestPopover portalTarget={null} />);

    await user.click(getTrigger());

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
