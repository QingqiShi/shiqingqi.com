import { describe, expect, it } from "vitest";
import { dropResizeObserverLoopErrors } from "./drop-resize-observer-loop-errors";
import { exceptionEvent, realError } from "./test-exception-events";

const resizeObserverLoopError = {
  type: "Error",
  value: "ResizeObserver loop completed with undelivered notifications.",
  mechanism: { handled: false, synthetic: true, type: "generic" },
};

describe("dropResizeObserverLoopErrors", () => {
  it("drops an exception whose every entry is a ResizeObserver loop warning", () => {
    const event = exceptionEvent([resizeObserverLoopError]);
    expect(dropResizeObserverLoopErrors(event)).toBeNull();
  });

  it("keeps a mixed list where one entry is real", () => {
    const event = exceptionEvent([resizeObserverLoopError, realError]);
    expect(dropResizeObserverLoopErrors(event)).toBe(event);
  });
});
