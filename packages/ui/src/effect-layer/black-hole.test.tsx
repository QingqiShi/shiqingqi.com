import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BLACK_HOLE_ATTRIBUTES } from "./black-hole-attributes.ts";
import { BlackHole } from "./black-hole.tsx";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { readSlotAttribute } from "./effect-boundary-slot.tsx";
import { EffectBoundary } from "./effect-boundary.tsx";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { roleBits } from "./effect-roles.ts";
import { LightBeam } from "./light-beam.tsx";

describe("BlackHole and LightBeam", () => {
  it("register one element with both roles and their settings", () => {
    const registry = createEffectRegistry();
    render(
      <EffectLayerContext value={registry.register}>
        <EffectBoundary>
          <BlackHole mass={2}>
            <LightBeam angle={45} followsPointer={false}>
              <div data-testid="element" />
            </LightBeam>
          </BlackHole>
        </EffectBoundary>
      </EffectLayerContext>,
    );
    const element = screen.getByTestId("element");

    expect([...registry.elements()]).toEqual([
      [
        element,
        expect.objectContaining({
          roles: roleBits(["blackHole", "lightBeam"]),
        }),
      ],
    ]);
    expect(readSlotAttribute(element, BLACK_HOLE_ATTRIBUTES.mass)).toBe("2");
    expect(readSlotAttribute(element, BLACK_HOLE_ATTRIBUTES.angle)).toBe("45");
    expect(
      readSlotAttribute(element, BLACK_HOLE_ATTRIBUTES.followsPointer),
    ).toBe("false");
  });

  it("leave a setting out when it is not set", () => {
    render(
      <LightBeam>
        <div data-testid="element" />
      </LightBeam>,
    );
    const element = screen.getByTestId("element");
    expect(readSlotAttribute(element, BLACK_HOLE_ATTRIBUTES.angle)).toBeNull();
    expect(
      readSlotAttribute(element, BLACK_HOLE_ATTRIBUTES.followsPointer),
    ).toBe("true");
  });

  it("read no setting from a slot that does not register the element", () => {
    render(
      <BlackHole mass={3}>
        <div>
          <span data-testid="inner" />
        </div>
      </BlackHole>,
    );
    expect(
      readSlotAttribute(
        screen.getByTestId("inner"),
        BLACK_HOLE_ATTRIBUTES.mass,
      ),
    ).toBeNull();
  });
});
