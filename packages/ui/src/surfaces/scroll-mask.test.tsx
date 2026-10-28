import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
