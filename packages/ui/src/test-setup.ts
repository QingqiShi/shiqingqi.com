import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { installJsdomShims } from "./test-support/install-jsdom-shims.ts";

// jsdom doesn't implement the Pointer Capture API.
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();
HTMLElement.prototype.hasPointerCapture = vi.fn();

installJsdomShims();

afterEach(() => {
  cleanup();
});
