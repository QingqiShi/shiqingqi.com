import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { installJsdomShims } from "./test-support/install-jsdom-shims.ts";

installJsdomShims();

// Mocks, so a test can read the calls.
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();
HTMLElement.prototype.hasPointerCapture = vi.fn();

afterEach(() => {
  cleanup();
});
