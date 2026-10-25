import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TabBarLinkProps } from "../actions/tab-bar.tsx";
import { createEffectRegistry } from "../effect-layer/create-effect-registry.ts";
import { EffectLayerContext } from "../effect-layer/effect-layer-context.ts";
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

describe("TabView rail liquid effect and drag", () => {
  // jsdom has no pointer capture. A real browser routes the pointer to the
  // track; the events here go to the track already.
  if (!("setPointerCapture" in HTMLElement.prototype)) {
    Object.assign(HTMLElement.prototype, { setPointerCapture() {} });
  }

  /**
   * The rail's two destinations, 56px tall each from y = 100 on a 56px
   * wide track. jsdom lays nothing out, so each box is given.
   */
  function renderRail({
    effect,
    linkComponent,
  }: Partial<ComponentProps<typeof TabView>> = {}) {
    const registry = createEffectRegistry();
    render(
      <EffectLayerContext value={registry}>
        {view({ effect, linkComponent })}
      </EffectLayerContext>,
    );
    const [rail] = screen.getAllByRole("navigation", { name: "App" });
    const track = within(rail).getByRole("list").parentElement;
    if (track === null) {
      throw new Error("The list has no track.");
    }
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 4, y: 100, width: 56, height: 112 }),
    );
    vi.spyOn(track, "clientHeight", "get").mockReturnValue(112);
    const links = within(rail).getAllByRole("link");
    links.forEach((link, index) => {
      vi.spyOn(link, "getBoundingClientRect").mockReturnValue(
        DOMRect.fromRect({ x: 4, y: 100 + index * 56, width: 56, height: 56 }),
      );
    });
    const liquid = () => registry.elements().get(track)?.settings.liquid;
    const at = (clientY: number) => ({
      pointerId: 1,
      clientX: 32,
      clientY,
      button: 0,
      pointerType: "mouse",
    });
    return { track, links, liquid, at };
  }

  it("draws the rail's indicator as liquid down the rail, resting on the current destination", () => {
    const { track, liquid } = renderRail();
    expect(track).toHaveAttribute("data-liquid-vertical");
    expect(liquid()).toMatchObject({ position: 0, drag: null, pressed: false });
  });

  it('draws no effect in the rail with effect="none"', () => {
    const { liquid } = renderRail({ effect: "none" });
    expect(liquid()).toBeUndefined();
  });

  it("drags the indicator down the rail and follows the link under it on release", () => {
    const followed: string[] = [];
    function Link({ onClick, ...props }: TabBarLinkProps) {
      return (
        <a
          {...props}
          onClick={(event) => {
            onClick?.(event);
            event.preventDefault();
            followed.push(props.href);
          }}
        />
      );
    }
    const { track, links, liquid, at } = renderRail({ linkComponent: Link });

    fireEvent.pointerDown(links[0], at(128));
    fireEvent.pointerMove(track, at(156));
    expect(liquid()?.drag).toBeCloseTo(0.5);

    fireEvent.pointerMove(track, at(180));
    fireEvent.pointerUp(track, at(180));
    expect(followed).toEqual(["/search"]);
    expect(liquid()).toMatchObject({ position: 1, drag: null, pressed: false });
  });

  it('moves the plain indicator down the rail with a drag under effect="none"', () => {
    const { track, links, at } = renderRail({ effect: "none" });
    const indicator = within(track).getByRole("list").previousElementSibling;
    const style = () => indicator?.getAttribute("style") ?? "";

    fireEvent.pointerDown(links[0], at(128));
    fireEvent.pointerMove(track, at(156));
    expect(style()).toContain("28px");
  });
});
