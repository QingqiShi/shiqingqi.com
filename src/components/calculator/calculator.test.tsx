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
