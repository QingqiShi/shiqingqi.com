import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/testing/test-utils.tsx";
import { Calculator } from "./calculator";

// Browser APIs not available in jsdom
beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

function getDisplay() {
  return screen.getByRole("status");
}

async function pressButtons(
  user: ReturnType<typeof userEvent.setup>,
  labels: string[],
) {
  for (const label of labels) {
    const button = screen.getByRole("button", { name: label });
    await user.click(button);
  }
}

describe("Calculator", () => {
  it("allows a full calculation after a division-by-zero error", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await pressButtons(user, ["1", "Divide", "0", "Equals"]);
    expect(getDisplay()).toHaveTextContent("Error");

    await pressButtons(user, ["2", "Add", "3", "Equals"]);
    expect(getDisplay()).toHaveTextContent("5");
  });

  it("backspaces in the middle of a calculation", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await pressButtons(user, ["1", "2", "Add", "3", "4"]);
    expect(getDisplay()).toHaveTextContent("12 + 34");

    await user.keyboard("{Backspace}");
    expect(getDisplay()).toHaveTextContent("12 + 3");

    await pressButtons(user, ["Equals"]);
    expect(getDisplay()).toHaveTextContent("15");
  });

  it("negates a number and still lets the user continue typing after a trailing decimal", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Type "5.", then ±, then "0" — should read -5.0, not -50
    await pressButtons(user, ["5", "Decimal point", "Toggle sign", "0"]);
    await pressButtons(user, ["Equals"]);
    expect(getDisplay()).toHaveTextContent("-5");
  });

  it("applies percent and continues to accept a following operator", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // 5 % → 0.05, then × 4 = 0.2
    await pressButtons(user, ["5", "Percent", "Multiply", "4", "Equals"]);
    expect(getDisplay()).toHaveTextContent("0.2");
  });

  it("activates a focused digit button on Enter instead of evaluating the expression", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    screen.getByRole("button", { name: "5" }).focus();
    await user.keyboard("{Enter}");

    expect(getDisplay()).toHaveTextContent("5");
  });

  it("evaluates typed input when Enter is pressed while the wrapper has focus", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    screen.getByRole("group", { name: "Calculator" }).focus();
    await user.keyboard("2+3");
    expect(getDisplay()).toHaveTextContent("2 + 3");

    await user.keyboard("{Enter}");
    expect(getDisplay()).toHaveTextContent("5");
  });
});
