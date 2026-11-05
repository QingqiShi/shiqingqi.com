import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { markerTargetOf, NAV_MARKER } from "./create-nav-list-motion.ts";
import { NavGroup } from "./nav-group.tsx";
import { NavLink } from "./nav-link.tsx";
import { NavList } from "./nav-list.tsx";

describe("markerTargetOf", () => {
  it("marks the current link, or the row of the closed group that holds it", async () => {
    const user = userEvent.setup();
    render(
      <NavList>
        <NavGroup label="Guides">
          <NavLink href="/start">Start</NavLink>
          <NavGroup label="Basics" current>
            <NavLink href="/install" current>
              Install
            </NavLink>
          </NavGroup>
        </NavGroup>
      </NavList>,
    );
    const install = screen.getByRole("link", { name: "Install" });
    const basics = screen.getByRole("button", { name: "Basics" });

    expect(markerTargetOf(install)).toBe(install);
    await user.click(basics);
    expect(markerTargetOf(install)).toBe(basics);
    await user.click(basics);
    expect(markerTargetOf(install)).toBe(install);
  });
});

describe("the marker while a group moves the rows", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const shownOf = (container: HTMLElement) => {
    const marker = container.querySelector<HTMLElement>(`[${NAV_MARKER}]`);
    if (marker === null) throw new Error("No marker.");
    return Number(/opacity\((.+)\)/.exec(marker.style.filter)?.[1]);
  };

  it("follows the page after the group that moves is removed", async () => {
    const clock = fakeMotionClock();
    const page = (hasGroup: boolean, isCurrent: boolean) => (
      <NavList>
        <NavGroup label="Guides">
          <NavLink href="/start" current={isCurrent}>
            Start
          </NavLink>
          {hasGroup ? (
            <NavGroup label="Basics">
              <NavLink href="/install">Install</NavLink>
            </NavGroup>
          ) : null}
        </NavGroup>
      </NavList>
    );
    const { container, rerender } = render(page(true, false));

    fireEvent.click(screen.getByRole("button", { name: "Basics" }));
    await act(() => clock.advance(0.05));
    rerender(page(false, false));
    rerender(page(false, true));
    await act(() => clock.advance(2));

    expect(shownOf(container)).toBeGreaterThan(0);
  });

  it("shows when a closed group becomes current and opens", async () => {
    const clock = fakeMotionClock();
    const page = (isCurrent: boolean) => (
      <NavList>
        <NavGroup label="Guides">
          <NavGroup label="Basics" current={isCurrent}>
            <NavLink href="/install" current={isCurrent}>
              Install
            </NavLink>
          </NavGroup>
        </NavGroup>
      </NavList>
    );
    const { container, rerender } = render(page(false));
    await act(() => clock.advance(1));
    expect(shownOf(container)).toBe(0);

    rerender(page(true));
    await act(() => clock.advance(2));

    expect(shownOf(container)).toBeGreaterThan(0);
  });
});
