import { describe, expect, it } from "vitest";
import { dropSkippedTransitionErrors } from "./drop-skipped-transition-errors";
import { exceptionEvent, realError } from "./test-exception-events";

const skippedTransitionError = {
  type: "DOMException",
  value: "AbortError: Transition was skipped",
  mechanism: { handled: false, synthetic: false, type: "generic" },
};

describe("dropSkippedTransitionErrors", () => {
  it("drops an exception whose every entry is a skipped transition", () => {
    const event = exceptionEvent([skippedTransitionError]);
    expect(dropSkippedTransitionErrors(event)).toBeNull();
  });

  it("keeps a mixed list where one entry is real", () => {
    const event = exceptionEvent([skippedTransitionError, realError]);
    expect(dropSkippedTransitionErrors(event)).toBe(event);
  });
});
