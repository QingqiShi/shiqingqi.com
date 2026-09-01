import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import {
  captureEvent,
  dropOpaqueCrossOriginErrors,
  dropSkippedTransitionErrors,
} from "./posthog";

const opaqueCrossOriginError = {
  type: "Error",
  value: "Script error.",
  mechanism: { handled: false, synthetic: true, type: "generic" },
};

const realError = {
  type: "TypeError",
  value: "movie.title is not a function",
  mechanism: { handled: false, synthetic: false, type: "generic" },
  stacktrace: {
    type: "raw",
    frames: [
      {
        platform: "web:javascript",
        filename: "https://qingqi.dev/_next/static/chunk.js",
        lineno: 1,
        colno: 42,
      },
    ],
  },
};

function exceptionEvent(exceptionList: unknown[]) {
  return {
    uuid: "01994f9c-0000-7000-8000-000000000000",
    event: "$exception",
    properties: { $exception_list: exceptionList },
  } satisfies CaptureResult;
}

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

  it("keeps an exception that carries a real error", () => {
    const event = exceptionEvent([realError]);
    expect(dropSkippedTransitionErrors(event)).toBe(event);
  });

  it("keeps a mixed list where one entry is real", () => {
    const event = exceptionEvent([skippedTransitionError, realError]);
    expect(dropSkippedTransitionErrors(event)).toBe(event);
  });

  it("keeps a DOMException with another message", () => {
    const event = exceptionEvent([
      {
        ...skippedTransitionError,
        value: "AbortError: The user aborted a request.",
      },
    ]);
    expect(dropSkippedTransitionErrors(event)).toBe(event);
  });

  it("keeps the same message thrown as a plain Error", () => {
    const event = exceptionEvent([
      { ...skippedTransitionError, type: "Error" },
    ]);
    expect(dropSkippedTransitionErrors(event)).toBe(event);
  });

  it("keeps a non-exception event", () => {
    const event = {
      uuid: "01994f9c-0000-7000-8000-000000000002",
      event: "$pageview",
      properties: { $current_url: "https://qingqi.dev/" },
    } satisfies CaptureResult;
    expect(dropSkippedTransitionErrors(event)).toBe(event);
  });

  it("passes a null event through", () => {
    expect(dropSkippedTransitionErrors(null)).toBeNull();
  });
});

describe("captureEvent", () => {
  it("stays silent before initPostHog runs", () => {
    expect(() => {
      captureEvent("conversation started", { locale: "en" });
    }).not.toThrow();
  });
});
