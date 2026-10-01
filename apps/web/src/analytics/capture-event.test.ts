import { describe, expect, it } from "vitest";
import { captureEvent } from "./capture-event";

describe("captureEvent", () => {
  it("stays silent before initPostHog runs", () => {
    expect(() => {
      captureEvent("conversation started", { locale: "en" });
    }).not.toThrow();
  });
});
