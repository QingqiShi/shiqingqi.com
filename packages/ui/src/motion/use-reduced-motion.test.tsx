import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { useReducedMotion } from "./use-reduced-motion.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

function ReducedMotion() {
  return <output>{String(useReducedMotion())}</output>;
}

describe("useReducedMotion", () => {
  it("is false where the user does not ask for reduced motion", () => {
    const { getByRole } = render(<ReducedMotion />);
    expect(getByRole("status")).toHaveTextContent("false");
  });

  it("is true where the user asks for reduced motion", () => {
    reduceMotion();
    const { getByRole } = render(<ReducedMotion />);
    expect(getByRole("status")).toHaveTextContent("true");
  });
});
