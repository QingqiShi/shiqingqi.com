import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { CalculatorDisplay } from "./calculator-display";
import type { BinaryOperatorToken, NumberToken } from "./types";

let observerConstructions: number;
let observerDisconnections: number;

beforeEach(() => {
  observerConstructions = 0;
  observerDisconnections = 0;

  globalThis.ResizeObserver = class ResizeObserver {
    constructor(_callback: ResizeObserverCallback) {
      observerConstructions++;
    }
    observe() {}
    unobserve() {}
    disconnect() {
      observerDisconnections++;
    }
  };
});

function num(value: number): NumberToken {
  return { type: "number", value, raw: String(value) };
}

function op(value: "+" | "−" | "×" | "÷"): BinaryOperatorToken {
  return { type: "binaryOperator", value };
}

describe("CalculatorDisplay", () => {
  it("renders formatted token values joined by spaces", () => {
    render(
      <CalculatorDisplay tokens={[num(1), op("+")]} currentToken={num(2)} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("1 + 2");
  });

  it("renders Error for NaN token values", () => {
    render(<CalculatorDisplay tokens={[]} currentToken={num(NaN)} />);
    expect(screen.getByRole("status")).toHaveTextContent("Error");
  });

  it("has polite aria-live for accessibility", () => {
    render(<CalculatorDisplay tokens={[]} currentToken={num(0)} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("does not recreate ResizeObserver when display text changes", () => {
    const { rerender } = render(
      <CalculatorDisplay tokens={[]} currentToken={num(0)} />,
    );
    const initialObservers = observerConstructions;
    expect(observerDisconnections).toBe(0);

    rerender(<CalculatorDisplay tokens={[]} currentToken={num(42)} />);

    expect(observerConstructions).toBe(initialObservers);
    expect(observerDisconnections).toBe(0);
  });

  it("disconnects all observers on unmount", () => {
    const { unmount } = render(
      <CalculatorDisplay tokens={[]} currentToken={num(0)} />,
    );
    expect(observerDisconnections).toBe(0);

    unmount();

    expect(observerDisconnections).toBe(observerConstructions);
  });
});
