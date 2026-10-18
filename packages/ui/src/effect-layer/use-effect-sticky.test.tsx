import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { createElementTracker } from "./create-element-tracker.ts";
import { EffectCarrier } from "./effect-carrier.tsx";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { useEffectSticky } from "./use-effect-sticky.ts";
import { useScrollRegion } from "./use-scroll-region.ts";

const UNSTUCK = "use-effect-sticky__styles.unstuck";

/** A bar with its stuck state in a data attribute. */
function Bar({ children }: { children?: ReactNode }) {
  const sticky = useEffectSticky();
  const { ref, isStuck, css } = sticky;
  return (
    <div ref={ref} css={css} data-testid="bar" data-stuck={isStuck}>
      <EffectCarrier value={sticky}>{children}</EffectCarrier>
    </div>
  );
}

/**
 * Renders `ui` around a `Bar` that sticks 64px from the top, and returns a
 * function that lays the bar out `y` px from the top and signals its stuck
 * watch, with the stand-in observers.
 */
function renderBar(ui: (bar: ReactNode) => ReactNode = (bar) => bar) {
  const observers = stubObservers();
  render(ui(<Bar />));
  const bar = screen.getByTestId("bar");
  bar.style.position = "sticky";
  bar.style.top = "64px";
  // An observer reports once when it starts to observe.
  observers.intersect(bar);
  const moveBar = (y: number) => {
    layOut(bar, { x: 0, y, width: 300, height: 48 });
    act(() => {
      observers.intersect(bar);
    });
    return bar;
  };
  return Object.assign(moveBar, { observers });
}

/** A Scroll region around `children`. */
function Region({ children }: { children: ReactNode }) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div ref={scroller} data-testid="scroller">
      <div ref={content}>
        <EffectCarrier value={region}>{children}</EffectCarrier>
      </div>
    </div>
  );
}

describe("useEffectSticky", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("drops the box under the effect layer while it is not stuck, and gives it back its own plane while it is", () => {
    const moveBar = renderBar();
    let bar = moveBar(200);
    expect(bar.dataset.stuck).toBe("false");
    expect(bar.className).toContain(UNSTUCK);

    bar = moveBar(64);
    expect(bar.dataset.stuck).toBe("true");
    expect(bar.className).not.toContain(UNSTUCK);

    bar = moveBar(120);
    expect(bar.dataset.stuck).toBe("false");
    expect(bar.className).toContain(UNSTUCK);
  });

  it("gives the effect layer the same stuck state as the plane, and tells it each change", () => {
    const registry = createEffectRegistry();
    const told: number[] = [];
    registry.track(
      (element) => createElementTracker(element, () => {}),
      (id) => {
        told.push(id);
      },
    );
    const moveBar = renderBar((bar) => (
      <EffectLayerContext value={registry}>{bar}</EffectLayerContext>
    ));
    const id = told.at(0);
    if (id === undefined) {
      throw new Error("the bar did not register");
    }
    const stuck = () => registry.sticky(id)?.isStuck();
    expect(stuck()).toBe(false);

    const bar = moveBar(64);
    expect(stuck()).toBe(true);
    expect(bar.dataset.stuck).toBe("true");
    expect(told).toEqual([id, id]);

    moveBar(200);
    expect(stuck()).toBe(false);
    expect(told).toEqual([id, id, id]);
  });

  it("switches the plane inside a contained box, where the box is no carrier", () => {
    const registry = createEffectRegistry();
    const told: number[] = [];
    registry.track(
      (element) => createElementTracker(element, () => {}),
      (id) => {
        told.push(id);
      },
    );
    const moveBar = renderBar((bar) => (
      <EffectLayerContext value={registry}>
        <EffectCarrier value="contained">{bar}</EffectCarrier>
      </EffectLayerContext>
    ));
    const bar = moveBar(64);
    expect(bar.dataset.stuck).toBe("true");
    expect(bar.className).not.toContain(UNSTUCK);
    expect(told).toEqual([]);
  });

  it("watches a box in a Scroll region against the region's scroller less its padding, and switches its plane from there", async () => {
    const registry = createEffectRegistry();
    const told: number[] = [];
    registry.track(
      (element) => createElementTracker(element, () => {}),
      (id) => {
        told.push(id);
      },
    );
    const moveBar = renderBar((bar) => (
      <EffectLayerContext value={registry}>
        <Region>{bar}</Region>
      </EffectLayerContext>
    ));
    const scroller = screen.getByTestId("scroller");
    scroller.style.paddingTop = "16px";
    layOut(scroller, { x: 0, y: 300, width: 300, height: 400 });
    // The scroller attaches after the bar, and the bar takes it one task later.
    await act(async () => {});
    const bar = screen.getByTestId("bar");
    expect(moveBar.observers.intersectionRootsOf(bar)).toEqual([scroller]);
    moveBar.observers.intersect(bar);
    const id = told.at(0);
    if (id === undefined) {
      throw new Error("the bar did not register");
    }

    moveBar(64);
    expect(bar.dataset.stuck).toBe("false");
    expect(bar.className).toContain(UNSTUCK);
    expect(registry.sticky(id)?.isStuck()).toBe(false);

    moveBar(364);
    expect(bar.dataset.stuck).toBe("false");

    moveBar(380);
    expect(bar.dataset.stuck).toBe("true");
    expect(bar.className).not.toContain(UNSTUCK);
    expect(registry.sticky(id)?.isStuck()).toBe(true);
  });
});
