import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDisclosure } from "./use-disclosure.ts";

function Harness(options: Parameters<typeof useDisclosure>[0]) {
  const { open, triggerProps, panelProps } = useDisclosure(options);
  return (
    <div>
      <button {...triggerProps}>Details</button>
      <div {...panelProps} data-testid="panel">
        {open ? "open" : "closed"}
      </div>
    </div>
  );
}

function ControlledHarness() {
  const [open, setOpen] = useState(false);
  const { triggerProps, panelProps } = useDisclosure({
    open,
    onOpenChange: setOpen,
  });
  return (
    <div>
      <button {...triggerProps}>Details</button>
      <div {...panelProps} data-testid="panel">
        Panel
      </div>
    </div>
  );
}

describe("useDisclosure", () => {
  it("wires the trigger to the panel it controls", () => {
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger).toHaveAttribute("type", "button");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.getAttribute("aria-controls")).toBe(
      screen.getByTestId("panel").id,
    );
  });

  it("hides the panel while collapsed and reveals it on toggle", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByTestId("panel")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByTestId("panel")).toBeVisible();
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("honours defaultOpen when uncontrolled", () => {
    render(<Harness defaultOpen />);

    expect(screen.getByTestId("panel")).toBeVisible();
  });

  it("reports the next state through onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("lets a parent own the state when controlled", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);

    expect(screen.getByTestId("panel")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByTestId("panel")).toBeVisible();
  });

  it("uses a caller-supplied panel id", () => {
    render(<Harness panelId="custom-panel" />);

    expect(screen.getByTestId("panel")).toHaveAttribute("id", "custom-panel");
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute(
      "aria-controls",
      "custom-panel",
    );
  });
});
