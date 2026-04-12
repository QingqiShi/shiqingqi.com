import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
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

describe("Calculator error recovery", () => {
  it("recovers from division by zero when pressing a number", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Trigger division by zero: 5 ÷ 0 =
    await pressButtons(user, ["5", "Divide", "0", "Equals"]);
    expect(getDisplay()).toHaveTextContent("Error");

    // Press a number — should start a fresh calculation
    await pressButtons(user, ["3"]);
    expect(getDisplay()).toHaveTextContent("3");
  });

  it("recovers from division by zero when pressing an operator", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Trigger division by zero: 5 ÷ 0 =
    await pressButtons(user, ["5", "Divide", "0", "Equals"]);
    expect(getDisplay()).toHaveTextContent("Error");

    // Press an operator — should reset to 0
    await pressButtons(user, ["Add"]);
    expect(getDisplay()).toHaveTextContent("0");
  });

  it("recovers from division by zero when pressing equals", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Trigger division by zero: 5 ÷ 0 =
    await pressButtons(user, ["5", "Divide", "0", "Equals"]);
    expect(getDisplay()).toHaveTextContent("Error");

    // Press equals — should reset to 0
    await pressButtons(user, ["Equals"]);
    expect(getDisplay()).toHaveTextContent("0");
  });

  it("recovers from division by zero with AC", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Trigger division by zero: 5 ÷ 0 =
    await pressButtons(user, ["5", "Divide", "0", "Equals"]);
    expect(getDisplay()).toHaveTextContent("Error");

    // Press AC — should reset to 0
    await pressButtons(user, ["All clear"]);
    expect(getDisplay()).toHaveTextContent("0");
  });

  it("allows a full calculation after error recovery", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Trigger division by zero: 1 ÷ 0 =
    await pressButtons(user, ["1", "Divide", "0", "Equals"]);
    expect(getDisplay()).toHaveTextContent("Error");

    // Start a new calculation: 2 + 3 =
    await pressButtons(user, ["2", "Add", "3", "Equals"]);
    expect(getDisplay()).toHaveTextContent("5");
  });
});

describe("Calculator Backspace", () => {
  it("deletes the last digit of a multi-digit number", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await pressButtons(user, ["1", "2", "3"]);
    expect(getDisplay()).toHaveTextContent("123");

    await user.keyboard("{Backspace}");
    expect(getDisplay()).toHaveTextContent("12");
  });

  it("resets to 0 when deleting the only digit", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await pressButtons(user, ["5"]);
    expect(getDisplay()).toHaveTextContent("5");

    await user.keyboard("{Backspace}");
    expect(getDisplay()).toHaveTextContent("0");
  });

  it("resets to 0 when backspacing the initial 0", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    expect(getDisplay()).toHaveTextContent("0");
    await user.keyboard("{Backspace}");
    expect(getDisplay()).toHaveTextContent("0");
  });

  it("removes the operator and restores the previous number", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await pressButtons(user, ["4", "2", "Add"]);
    expect(getDisplay()).toHaveTextContent("42 +");

    await user.keyboard("{Backspace}");
    expect(getDisplay()).toHaveTextContent("42");
  });

  it("deletes digits after a decimal point", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await pressButtons(user, ["3", "Decimal point", "5"]);
    expect(getDisplay()).toHaveTextContent("3.5");

    await user.keyboard("{Backspace}");
    // Raw is now "3." — display shows "3" since Number("3.") === 3
    expect(getDisplay()).toHaveTextContent("3");

    // Typing another digit continues after the decimal
    await pressButtons(user, ["7"]);
    expect(getDisplay()).toHaveTextContent("3.7");
  });

  it("recovers from error state", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await pressButtons(user, ["5", "Divide", "0", "Equals"]);
    expect(getDisplay()).toHaveTextContent("Error");

    await user.keyboard("{Backspace}");
    expect(getDisplay()).toHaveTextContent("0");
  });

  it("works correctly in the middle of a calculation", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Type 12 + 34, then backspace to get 12 + 3, then complete
    await pressButtons(user, ["1", "2", "Add", "3", "4"]);
    expect(getDisplay()).toHaveTextContent("12 + 34");

    await user.keyboard("{Backspace}");
    expect(getDisplay()).toHaveTextContent("12 + 3");

    await pressButtons(user, ["Equals"]);
    expect(getDisplay()).toHaveTextContent("15");
  });
});
