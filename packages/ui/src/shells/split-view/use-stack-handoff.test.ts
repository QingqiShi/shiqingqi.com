import { describe, expect, it } from "vitest";
import { stackChange } from "./use-stack-handoff.ts";

describe("stackChange", () => {
  it("pushes where the way back of the new screen leads to the old one", () => {
    expect(
      stackChange({
        leftHref: "/list",
        leftBackHref: null,
        href: "/list/new",
        backHref: "/list",
      }),
    ).toBe("push");
  });

  it("pops where the way back of the old screen leads to the new one", () => {
    expect(
      stackChange({
        leftHref: "/list/new",
        leftBackHref: "/list",
        href: "/list",
        backHref: null,
      }),
    ).toBe("pop");
  });

  it("plays nothing between screens that do not follow each other", () => {
    expect(
      stackChange({
        leftHref: "/list/new",
        leftBackHref: "/list",
        href: "/settings",
        backHref: null,
      }),
    ).toBeNull();
  });
});
