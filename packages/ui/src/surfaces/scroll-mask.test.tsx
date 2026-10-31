import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createEffectRegistry } from "../effect-layer/create-effect-registry.ts";
import { scrollerOf } from "../effect-layer/effect-carrier-context.ts";
import { EffectLayerContext } from "../effect-layer/effect-layer-context.ts";
import { useEffectBoundary } from "../effect-layer/use-effect-boundary.ts";
import { ScrollMask } from "./scroll-mask.tsx";

// jsdom lays nothing out, so no region ever overflows. This gives the
// scroller a scroll position to read and fires the event the hook listens
// for, which is how a test reaches a state where both edges mask.
function driveMask(root: HTMLElement) {
  const scroller = root.firstElementChild;
  if (!(scroller instanceof HTMLElement)) {
    throw new Error("ScrollMask rendered no scroller");
  }
  const metrics = {
    scrollLeft: 100,
    scrollTop: 100,
    clientWidth: 200,
    clientHeight: 200,
    scrollWidth: 500,
    scrollHeight: 500,
  };
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(scroller, key, {
      configurable: true,
      get: () => value,
    });
  }
  act(() => {
    scroller.dispatchEvent(new Event("scroll"));
  });
  return scroller;
}

describe("ScrollMask scroll buttons", () => {
  it("scrolls one viewport along the scroll axis when a button is clicked", () => {
    const { container } = render(
      <ScrollMask
        orientation="horizontal"
        scrollButtons={{ startLabel: "Scroll left", endLabel: "Scroll right" }}
      >
        <span>content</span>
      </ScrollMask>,
    );
    const root = container.firstElementChild;
    if (!(root instanceof HTMLElement)) {
      throw new Error("ScrollMask rendered nothing");
    }
    const scroller = driveMask(root);
    // jsdom has no real scrolling, so a click is observed through `scrollBy`.
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy;

    fireEvent.click(screen.getByRole("button", { name: "Scroll right" }));
    fireEvent.click(screen.getByRole("button", { name: "Scroll left" }));

    expect(scrollBy).toHaveBeenNthCalledWith(1, {
      left: 200,
      behavior: "smooth",
    });
    expect(scrollBy).toHaveBeenNthCalledWith(2, {
      left: -200,
      behavior: "smooth",
    });
  });
});

describe("ScrollMask chrome", () => {
  it("sticks to the scroller of its own Scroll region", () => {
    function Control() {
      return <button ref={useEffectBoundary()} type="button" />;
    }
    // jsdom has no StyleX CSS, so the scroller gets its overflow here.
    const overflow = document.createElement("style");
    overflow.textContent = "[data-testid=scroller] { overflow-y: auto; }";
    document.head.append(overflow);
    const registry = createEffectRegistry();
    render(
      <EffectLayerContext value={registry}>
        <ScrollMask data-testid="scroller" startChrome={<Control />}>
          <span>content</span>
        </ScrollMask>
      </EffectLayerContext>,
    );

    expect(scrollerOf(registry.carrierOf(screen.getByRole("button")))).toBe(
      screen.getByTestId("scroller"),
    );
    overflow.remove();
  });
});
