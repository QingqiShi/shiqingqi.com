import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Mock StyleX
vi.mock("@stylexjs/stylex", () => ({
  default: {
    create: (styles: Record<string, unknown>) => {
      const result: Record<string, string> = {};
      for (const key in styles) {
        result[key] = key;
      }
      return result;
    },
    props: (..._args: unknown[]) => ({ className: "", style: {} }),
    defineVars: <T extends Record<string, unknown>>(vars: T) => vars,
  },
  create: (styles: Record<string, unknown>) => {
    const result: Record<string, string> = {};
    for (const key in styles) {
      result[key] = key;
    }
    return result;
  },
  props: (..._args: unknown[]) => ({ className: "", style: {} }),
  defineVars: <T extends Record<string, unknown>>(vars: T) => vars,
}));

// Mock tokens
vi.mock("@/tokens.stylex", () => ({
  border: {},
  color: {
    textMain: "#000",
    backgroundMainChannels: "0, 0, 0",
  },
  font: {},
  layer: {},
  shadow: {},
  space: {},
}));
