import { describe, expect, it } from "vitest";
import { dropOpaqueCrossOriginErrors } from "./drop-opaque-cross-origin-errors";
import { exceptionEvent, realError } from "./test-exception-events";

const opaqueCrossOriginError = {
  type: "Error",
  value: "Script error.",
  mechanism: { handled: false, synthetic: true, type: "generic" },
};

describe("dropOpaqueCrossOriginErrors", () => {
  it("drops an exception whose every entry is an opaque cross-origin error", () => {
    const event = exceptionEvent([opaqueCrossOriginError]);
    expect(dropOpaqueCrossOriginErrors(event)).toBeNull();
  });

  it("keeps a mixed list where one entry is real", () => {
    const event = exceptionEvent([opaqueCrossOriginError, realError]);
    expect(dropOpaqueCrossOriginErrors(event)).toBe(event);
  });
});
