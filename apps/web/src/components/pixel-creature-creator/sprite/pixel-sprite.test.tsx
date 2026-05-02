import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "../state/creature-schema";
import { PixelSprite } from "./pixel-sprite";

describe("PixelSprite", () => {
  it("renders without throwing for the default creature", () => {
    expect(() => {
      render(<PixelSprite def={DEFAULT_CREATURE} />);
    }).not.toThrow();
  });

  it("marks the wrapper with data-paused when paused", () => {
    const result = render(
      <PixelSprite def={DEFAULT_CREATURE} paused aria-label="paused-stage" />,
    );
    const stage = result.getByLabelText("paused-stage");
    expect(stage.getAttribute("data-paused")).toBe("true");
  });

  it("omits data-paused when running", () => {
    const result = render(
      <PixelSprite def={DEFAULT_CREATURE} aria-label="running" />,
    );
    const stage = result.getByLabelText("running");
    expect(stage.hasAttribute("data-paused")).toBe(false);
  });

  it("writes the t=0 static pose to CSS variables when paused", () => {
    const result = render(
      <PixelSprite def={DEFAULT_CREATURE} paused aria-label="paused-pose" />,
    );
    const stage = result.getByLabelText("paused-pose");
    // For idle at t=0: bob(0, ...) = 0 → snapped to 0 art-px → 0 CSS px.
    // The effect runs synchronously inside render(), so the variables
    // should be present by the time we inspect the element.
    expect(stage.style.getPropertyValue("--pcc-body-dy")).toBe("0px");
    expect(stage.style.getPropertyValue("--pcc-body-dx")).toBe("0px");
  });

  it("supports an aria-label", () => {
    const result = render(
      <PixelSprite def={DEFAULT_CREATURE} aria-label="My creature" />,
    );
    expect(result.getByLabelText("My creature")).toBeInTheDocument();
  });
});
