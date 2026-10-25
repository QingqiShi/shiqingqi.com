import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { act, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TabBarLinkProps } from "../actions/tab-bar.tsx";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { TabView } from "./tab-view.tsx";

function view(
  props?: Partial<ComponentProps<typeof TabView>>,
  current: "/" | "/search" = "/",
) {
  return (
    <TabView
      label="App"
      items={[
        { href: "/", label: "Home", icon: HouseIcon, current: current === "/" },
        {
          href: "/search",
          label: "Search",
          icon: MagnifyingGlassIcon,
          current: current === "/search",
          badge: <span data-testid="dot" />,
          status: "New results",
        },
      ]}
      {...props}
    >
      Screen
    </TabView>
  );
}

function renderView(props?: Partial<ComponentProps<typeof TabView>>) {
  return render(view(props));
}

/** How far in the screen's rise is now, by its opacity, or null while it stays still. */
function rise() {
  const { opacity } = screen.getByRole("main").style;
  return opacity === "" ? null : Number(opacity);
}

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("TabView", () => {
  it("puts the destinations in the rail and in the tab bar", () => {
    renderView();
    const navs = screen.getAllByRole("navigation", { name: "App" });
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      const links = within(nav).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "/",
        "/search",
      ]);
      expect(links[0]).toHaveAttribute("aria-current", "page");
      expect(links[1]).not.toHaveAttribute("aria-current");
      expect(links[1]).toHaveTextContent("Search New results");
      expect(within(nav).getByTestId("dot")).toBeInTheDocument();
    }
  });

  it("renders the header and the footer in the rail", () => {
    renderView({ header: <span>Mark</span>, footer: <span>Member</span> });
    const [rail] = screen.getAllByRole("navigation", { name: "App" });
    const railBox = rail.parentElement;
    expect(railBox).toHaveTextContent("Mark");
    expect(railBox).toHaveTextContent("Member");
  });

  it("renders the screen in a main landmark, or in a div", () => {
    const { unmount } = renderView();
    expect(screen.getByRole("main")).toHaveTextContent("Screen");
    unmount();
    renderView({ as: "div" });
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByText("Screen")).toBeInTheDocument();
  });

  it("renders each destination with the link slot", () => {
    function Link(props: TabBarLinkProps) {
      return <a {...props} data-slot="" />;
    }
    renderView({ linkComponent: Link });
    expect(
      screen
        .getAllByRole("link")
        .every((link) => link.hasAttribute("data-slot")),
    ).toBe(true);
  });

  it("does not move the screen on the first render", () => {
    renderView();
    expect(rise()).toBeNull();
  });

  it("makes the new screen rise when the current destination changes", async () => {
    const { rerender } = renderView();
    rerender(view({}, "/search"));
    expect(rise()).toBe(0);
    expect(screen.getByRole("main").style.transform).toMatch(
      /^translateY\(calc\(1\.0000 \* /,
    );
    await act(() => clock.advance(0.1));
    expect(rise()).toBeGreaterThan(0.2);
    expect(rise()).toBeLessThan(1);

    rerender(view({}, "/"));
    expect(rise()).toBe(0);
    await act(() => clock.advance(1));
    expect(rise()).toBeNull();
    expect(screen.getByRole("main").style.transform).toBe("");
  });

  it("keeps the screen still while the destination stays the same", () => {
    const { rerender } = renderView();
    rerender(view({ children: "Drilled screen" }));
    expect(rise()).toBeNull();
  });

  it("follows the screen key, not the current item, when one is given", () => {
    const { rerender } = renderView({ screenKey: 0 });
    rerender(view({ screenKey: 0 }, "/search"));
    expect(rise()).toBeNull();
    rerender(view({ screenKey: 1 }, "/search"));
    expect(rise()).toBe(0);
  });

  it("makes the screen rise in the element that it renders as now", () => {
    const { rerender } = renderView();
    rerender(view({ as: "div" }));
    rerender(view({ as: "div" }, "/search"));
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByText("Screen").style.opacity).toBe("0");
  });

  it("keeps the screen still under reduced motion", () => {
    reduceMotion();
    const { rerender } = renderView();
    rerender(view({}, "/search"));
    expect(rise()).toBeNull();
  });
});
