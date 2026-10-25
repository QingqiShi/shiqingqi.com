import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MD_QUERY } from "../md-query.ts";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { stubMediaQueries } from "../test-support/stub-media-queries.ts";
import { SidebarLayout } from "./sidebar-layout.tsx";

let clock: ReturnType<typeof fakeMotionClock>;

/** Opens the drawer, and gives the rail. */
function open() {
  render(
    <SidebarLayout
      sidebar={<a href="/somewhere">Rail</a>}
      menuLabel="Menu"
      closeLabel="Close menu"
    >
      Body
    </SidebarLayout>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  return screen.getByRole("dialog");
}

/** How far the rail is off to the side, as a share of its width in %. */
function shiftOf(rail: HTMLElement) {
  return Number(/^translateX\((.+)%\)$/.exec(rail.style.transform)?.[1]);
}

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Drawer motion", () => {
  it("slides the rail in, then leaves it to the stylesheet", async () => {
    const rail = open();
    await act(() => clock.advance(0.05));
    expect(rail).toHaveAttribute("data-moving");
    expect(shiftOf(rail)).toBeGreaterThan(0);
    expect(shiftOf(rail)).toBeLessThan(110);
    expect(rail.style.visibility).toBe("visible");
    await act(() => clock.advance(1));
    expect(rail).not.toHaveAttribute("data-moving");
    expect(rail.style.transform).toBe("");
  });

  it("turns a close during the slide from where the rail is", async () => {
    const rail = open();
    await act(() => clock.advance(0.05));
    const shift = shiftOf(rail);
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    await act(() => clock.advance(0.016));
    expect(rail).toHaveAttribute("data-moving");
    expect(Math.abs(shiftOf(rail) - shift)).toBeLessThan(20);
  });

  it("leaves the rail to the stylesheet when the screen grows to md while it is open", async () => {
    const rail = open();
    await act(() => clock.advance(1));
    stubMediaQueries((query) => query === MD_QUERY);
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    await act(() => clock.advance(0.016));
    expect(rail.style.opacity).toBe("");
    expect(rail.style.transform).toBe("");
    await act(() => clock.advance(1));
    expect(rail.style.opacity).toBe("");
    expect(rail.style.transform).toBe("");
  });

  it("only fades under reduced motion", async () => {
    reduceMotion();
    const rail = open();
    await act(() => clock.advance(0.05));
    expect(rail).toHaveAttribute("data-moving");
    expect(rail.style.transform).toBe("");
    expect(Number(rail.style.opacity)).toBeGreaterThan(0);
  });
});
