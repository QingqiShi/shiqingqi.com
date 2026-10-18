import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { EffectCarrier } from "./effect-carrier.tsx";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { PAGE_CARRIER, VIEWPORT_BOTTOM_CARRIER } from "./resolve-carrier.ts";
import { useEffectBoundary } from "./use-effect-boundary.ts";
import { useEffectSticky } from "./use-effect-sticky.ts";

function renderWithRegistry(children: ReactNode) {
  const registry = createEffectRegistry();
  const result = render(
    <EffectLayerContext value={registry}>{children}</EffectLayerContext>,
  );
  const entry = (testId: string) =>
    registry.elements().get(screen.getByTestId(testId));
  return { ...result, registry, entry };
}

describe("EffectCarrier", () => {
  it("puts the effect hooks inside it on the carrier it declares, and the rest on the page", () => {
    function Bar() {
      const outside = useEffectBoundary();
      const inside = useEffectBoundary();
      return (
        <>
          <div ref={outside} data-testid="outside" />
          <nav>
            <EffectCarrier value="viewport-bottom">
              <Inner refCallback={inside} />
            </EffectCarrier>
          </nav>
        </>
      );
    }
    function Inner({
      refCallback,
    }: {
      refCallback: (element: Element | null) => void;
    }) {
      const ref = useEffectBoundary();
      return (
        <>
          <span ref={ref} data-testid="hook-inside" />
          <span ref={refCallback} data-testid="hook-outside" />
        </>
      );
    }
    const { entry } = renderWithRegistry(<Bar />);
    expect(entry("outside")?.carrier).toBe(PAGE_CARRIER);
    expect(entry("hook-inside")?.carrier).toBe(VIEWPORT_BOTTOM_CARRIER);
    expect(entry("hook-outside")?.carrier).toBe(PAGE_CARRIER);
  });

  it("keeps the effect hooks in a contained box on the carrier around the box, whatever they declare", () => {
    function Stage() {
      const sticky = useEffectSticky();
      const { ref } = sticky;
      return (
        <div ref={ref} data-testid="bar">
          <EffectCarrier value={sticky}>
            <EffectCarrier value="viewport">
              <Boundary testId="inside" />
            </EffectCarrier>
          </EffectCarrier>
        </div>
      );
    }
    function Boundary({ testId }: { testId: string }) {
      const ref = useEffectBoundary();
      return <span ref={ref} data-testid={testId} />;
    }
    const { entry, registry } = renderWithRegistry(
      <EffectCarrier value="contained">
        <Stage />
      </EffectCarrier>,
    );
    expect(entry("inside")?.carrier).toBe(PAGE_CARRIER);
    expect(registry.carrierOf(screen.getByTestId("bar"))).toBe(PAGE_CARRIER);
  });

  it("puts the effect hooks in a sticky box on its sticky carrier, and registers the box apart", () => {
    function Bar() {
      const sticky = useEffectSticky();
      const { ref: stickyRef } = sticky;
      const ref = useEffectBoundary();
      return (
        <div ref={stickyRef} data-testid="bar">
          <EffectCarrier value={sticky}>
            <Control />
          </EffectCarrier>
          <span ref={ref} />
        </div>
      );
    }
    function Control() {
      const ref = useEffectBoundary();
      return <button ref={ref} type="button" data-testid="control" />;
    }
    const { entry, registry, unmount } = renderWithRegistry(<Bar />);
    const carrier = entry("control")?.carrier;
    if (carrier?.kind !== "sticky") {
      throw new Error("the control is not on a sticky carrier");
    }
    expect(carrier.parent).toBe(PAGE_CARRIER);
    expect(registry.sticky(carrier.id)?.element).toBe(
      screen.getByTestId("bar"),
    );
    expect(entry("bar")).toBeUndefined();
    unmount();
    expect(registry.sticky(carrier.id)).toBeUndefined();
  });
});
