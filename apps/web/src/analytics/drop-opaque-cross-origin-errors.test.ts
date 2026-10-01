import type { CaptureResult } from "posthog-js";
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

  it("keeps an exception that carries a real error", () => {
    const event = exceptionEvent([realError]);
    expect(dropOpaqueCrossOriginErrors(event)).toBe(event);
  });

  it("keeps a mixed list where one entry is real", () => {
    const event = exceptionEvent([opaqueCrossOriginError, realError]);
    expect(dropOpaqueCrossOriginErrors(event)).toBe(event);
  });

  it("keeps a 'Script error.' that the browser did not synthesise", () => {
    const event = exceptionEvent([
      { ...opaqueCrossOriginError, mechanism: { synthetic: false } },
    ]);
    expect(dropOpaqueCrossOriginErrors(event)).toBe(event);
  });

  it("keeps an exception with an empty list", () => {
    const event = exceptionEvent([]);
    expect(dropOpaqueCrossOriginErrors(event)).toBe(event);
  });

  it("keeps a non-exception event", () => {
    const event = {
      uuid: "01994f9c-0000-7000-8000-000000000001",
      event: "$pageview",
      properties: { $current_url: "https://qingqi.dev/" },
    } satisfies CaptureResult;
    expect(dropOpaqueCrossOriginErrors(event)).toBe(event);
  });

  it("passes a null event through", () => {
    expect(dropOpaqueCrossOriginErrors(null)).toBeNull();
  });
});
