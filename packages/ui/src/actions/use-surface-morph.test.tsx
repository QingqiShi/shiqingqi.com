import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { MenuButton } from "./menu-button.tsx";

function menu(open: boolean) {
  return (
    <MenuButton
      buttonProps={{ "aria-label": "Options" }}
      menuContent={<button type="button">Item</button>}
      open={open}
      onOpenChange={() => {}}
    />
  );
}

/** The surface that morphs: the empty sibling before the popup. */
function surface() {
  const popup = screen.getByRole("menu", { hidden: true });
  const frame = popup.closest("[inert], div")?.parentElement;
  const found = frame?.querySelector<HTMLElement>(":scope > div:empty");
  if (!found) throw new Error("No surface");
  return found;
}

function opacity() {
  const { opacity: value } = surface().style;
  return value === "" ? null : Number(value);
}

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useSurfaceMorph", () => {
  it("grows the surface from the trigger and leaves it to the stylesheet at rest", async () => {
    const { rerender } = render(menu(false));
    expect(surface().style.width).toBe("");
    rerender(menu(true));
    await act(() => clock.advance(0.05));
    expect(surface().style.width).not.toBe("");
    expect(surface()).toHaveAttribute("data-moving");
    await act(() => clock.advance(1));
    expect(surface().style.width).toBe("");
    expect(opacity()).toBeNull();
  });

  it("keeps the surface seen until it is back over the trigger, then fades it", async () => {
    const { rerender } = render(menu(true));
    rerender(menu(false));
    await act(() => clock.advance(0.15));
    expect(opacity()).toBe(1);
    await act(() => clock.advance(0.12));
    expect(opacity()).toBeLessThan(1);
    await act(() => clock.advance(1));
    expect(opacity()).toBeNull();
  });

  it("turns a close into an open from where the surface is", async () => {
    const { rerender } = render(menu(true));
    rerender(menu(false));
    await act(() => clock.advance(0.25));
    rerender(menu(true));
    await act(() => clock.advance(0.016));
    expect(opacity()).toBe(1);
    expect(surface()).toHaveAttribute("data-moving");
  });

  it("only fades the surface under reduced motion", async () => {
    reduceMotion();
    const { rerender } = render(menu(false));
    rerender(menu(true));
    await act(() => clock.advance(0.05));
    expect(surface().style.width).toBe("");
    expect(opacity()).toBeGreaterThan(0);
    expect(opacity()).toBeLessThan(1);
    await act(() => clock.advance(1));
    expect(opacity()).toBeNull();
  });
});
