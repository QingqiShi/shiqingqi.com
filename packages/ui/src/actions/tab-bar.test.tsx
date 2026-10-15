import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import * as stylex from "@stylexjs/stylex";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEffectRegistry } from "../effect-layer/create-effect-registry.ts";
import { EffectLayerContext } from "../effect-layer/effect-layer-context.ts";
import { TabBar, type TabBarItem, type TabBarLinkProps } from "./tab-bar.tsx";

/** The weight each tab's icon is drawn in, read from its paths. */
function weightsOf(links: readonly HTMLElement[]) {
  const drawn = (weight: "bold" | "fill") =>
    render(<HouseIcon weight={weight} />).container.querySelector("svg")
      ?.innerHTML;
  const fill = drawn("fill");
  const bold = drawn("bold");
  return links.map((link) => {
    const paths = link.querySelector("svg")?.innerHTML;
    return paths === fill ? "fill" : paths === bold ? "bold" : "other";
  });
}

function itemsAt(current: number | null): TabBarItem[] {
  return ["Home", "Activity", "Settings"].map((label, index) => ({
    href: `/${label.toLowerCase()}`,
    label,
    icon: HouseIcon,
    current: index === current,
  }));
}

/**
 * A link Slot that records each click it follows and stops the browser
 * from following it, as a client-side router does.
 */
function recordingLink(followed: string[]) {
  return function RecordingLink({ onClick, ...props }: TabBarLinkProps) {
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
  };
}

describe("TabBar", () => {
  it("renders a named nav landmark with a link per item", () => {
    render(<TabBar label="Main" items={itemsAt(0)} />);

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "Activity" })).toHaveAttribute(
      "href",
      "/activity",
    );
  });

  it("marks only the current item with aria-current", () => {
    render(<TabBar label="Main" items={itemsAt(1)} />);

    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("fills the current item's icon and draws the others bold", () => {
    render(<TabBar label="Main" items={itemsAt(1)} />);

    expect(weightsOf(screen.getAllByRole("link"))).toEqual([
      "bold",
      "fill",
      "bold",
    ]);
  });

  it("keeps the icon out of the link's name", () => {
    render(
      <TabBar
        label="Main"
        items={[{ href: "/", label: "Home", icon: HouseIcon, current: true }]}
      />,
    );

    expect(screen.getByRole("link")).toHaveAccessibleName("Home");
    expect(
      screen.getByRole("link").querySelector("svg")?.closest("[aria-hidden]"),
    ).not.toBeNull();
  });

  it("renders the indicator as one decorative element before the list", () => {
    render(<TabBar label="Main" items={itemsAt(0)} />);

    const list = screen.getByRole("list");
    const indicator = list.previousElementSibling;
    expect(indicator).toHaveAttribute("aria-hidden", "true");
    expect(indicator).toHaveAttribute("data-liquid-indicator");
  });

  it("renders no indicator when no item is current", () => {
    render(<TabBar label="Main" items={itemsAt(null)} />);

    expect(screen.getByRole("list").previousElementSibling).toBeNull();
  });

  it("names the link with its status and announces it", () => {
    const items = itemsAt(0);
    items[2] = {
      ...items[2],
      badge: <span data-testid="dot" />,
      status: "Offline",
    };
    render(<TabBar label="Main" items={items} />);

    const settings = screen.getByRole("link", { name: "Settings Offline" });
    expect(within(settings).getByRole("status")).toHaveTextContent("Offline");
    expect(screen.getByTestId("dot").closest("[aria-hidden]")).not.toBeNull();
  });

  it("keeps an empty status region in place while the status is null", () => {
    const items = itemsAt(0);
    items[2] = { ...items[2], status: null };
    render(<TabBar label="Main" items={items} />);

    const settings = screen.getByRole("link", { name: "Settings" });
    expect(within(settings).getByRole("status")).toBeEmptyDOMElement();
    expect(
      within(screen.getByRole("link", { name: "Home" })).queryByRole("status"),
    ).toBeNull();
  });

  it("renders each tab through the link Slot", () => {
    const followed: string[] = [];
    render(
      <TabBar
        label="Main"
        items={itemsAt(0)}
        linkComponent={recordingLink(followed)}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Settings" }), {
      detail: 1,
    });
    expect(followed).toEqual(["/settings"]);
  });

  it("follows a link from the keyboard", async () => {
    const user = userEvent.setup();
    const followed: string[] = [];
    render(
      <TabBar
        label="Main"
        items={itemsAt(0)}
        linkComponent={recordingLink(followed)}
      />,
    );

    await user.tab();
    await user.tab();
    expect(screen.getByRole("link", { name: "Activity" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(followed).toEqual(["/activity"]);
  });

  it("composes a caller css override last onto the nav", () => {
    const overrides = stylex.create({ placed: { position: "fixed" } });
    render(<TabBar label="Main" items={itemsAt(0)} css={overrides.placed} />);

    expect(screen.getByRole("navigation").className).toContain(
      "overrides.placed",
    );
  });
});

describe("TabBar liquid effect and drag", () => {
  // jsdom has no pointer capture. A real browser routes the pointer to the
  // track; the events here go to the track already.
  if (!("setPointerCapture" in HTMLElement.prototype)) {
    Object.assign(HTMLElement.prototype, { setPointerCapture() {} });
  }

  /**
   * Three 100px tabs from x = 100 on a 64px track. jsdom lays nothing out,
   * so each box is given.
   */
  function renderBar({
    current = 0,
    effect,
  }: { current?: number | null; effect?: "liquid" | "none" } = {}) {
    const registry = createEffectRegistry();
    const followed: string[] = [];
    const Link = recordingLink(followed);
    const ui = (at: number | null) => (
      <EffectLayerContext value={registry.register}>
        <TabBar
          label="Main"
          items={itemsAt(at)}
          linkComponent={Link}
          effect={effect}
        />
      </EffectLayerContext>
    );
    const { rerender } = render(ui(current));
    const track = screen.getByRole("list").parentElement;
    if (track === null) {
      throw new Error("The list has no track.");
    }
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 50, width: 300, height: 64 }),
    );
    vi.spyOn(track, "clientWidth", "get").mockReturnValue(300);
    const links = screen.getAllByRole("link");
    links.forEach((link, index) => {
      vi.spyOn(link, "getBoundingClientRect").mockReturnValue(
        DOMRect.fromRect({
          x: 100 + index * 100,
          y: 50,
          width: 100,
          height: 64,
        }),
      );
    });
    const liquid = () => registry.elements().get(track)?.settings.liquid;
    const at = (clientX: number, clientY = 82) => ({
      pointerId: 1,
      clientX,
      clientY,
      button: 0,
      pointerType: "mouse",
    });
    return {
      track,
      links,
      liquid,
      followed,
      at,
      navigate: (to: number | null) => {
        rerender(ui(to));
      },
    };
  }

  it("draws the indicator as liquid by default, resting on the current tab", () => {
    const { liquid } = renderBar({ current: 1 });
    expect(liquid()).toMatchObject({ position: 1, drag: null, pressed: false });
  });

  it('draws no effect with effect="none"', () => {
    const { liquid } = renderBar({ effect: "none" });
    expect(liquid()).toBeUndefined();
  });

  it("moves to the tab a press is on and holds it there while its page loads", () => {
    const { links, liquid, followed, at, navigate } = renderBar();

    fireEvent.pointerDown(links[2], at(350));
    expect(liquid()).toMatchObject({ position: 2, drag: null, pressed: true });

    fireEvent.pointerUp(links[2], at(350));
    fireEvent.click(links[2], { detail: 1 });
    expect(followed).toEqual(["/settings"]);
    expect(liquid()).toMatchObject({ position: 2, pressed: false });
    expect(links[0]).toHaveAttribute("aria-current", "page");

    navigate(2);
    expect(liquid()?.position).toBe(2);
    expect(links[2]).toHaveAttribute("aria-current", "page");

    navigate(0);
    expect(liquid()?.position).toBe(0);
  });

  it("holds the indicator on a tapped tab until the click that the release makes", () => {
    const { links, liquid, followed, at } = renderBar();

    fireEvent.pointerDown(links[2], at(350));
    fireEvent.pointerUp(links[2], at(350));
    expect(liquid()).toMatchObject({ position: 2, pressed: false });
    expect(weightsOf(links)).toEqual(["bold", "bold", "fill"]);

    fireEvent.click(links[2], { detail: 1 });
    expect(followed).toEqual(["/settings"]);
    expect(liquid()?.position).toBe(2);
  });

  it("does not hold the indicator for a click that opens a new tab", () => {
    const { links, liquid, at } = renderBar();

    fireEvent.pointerDown(links[2], at(350));
    fireEvent.pointerUp(links[2], at(350));
    fireEvent.click(links[2], { detail: 1, metaKey: true });
    expect(liquid()?.position).toBe(0);
  });

  it("drags the indicator across the tabs and follows the link under it on release", () => {
    const { track, links, liquid, followed, at } = renderBar();

    fireEvent.pointerDown(links[0], at(150));
    fireEvent.pointerMove(track, at(151));
    expect(liquid()).toMatchObject({ position: 0, drag: null });

    fireEvent.pointerMove(track, at(200));
    expect(liquid()?.drag).toBeCloseTo(0.5);
    expect(weightsOf(links)).toEqual(["fill", "bold", "bold"]);

    fireEvent.pointerMove(track, at(330));
    expect(weightsOf(links)).toEqual(["bold", "bold", "fill"]);
    expect(followed).toEqual([]);

    fireEvent.pointerUp(track, at(330));
    expect(followed).toEqual(["/settings"]);
    expect(liquid()).toMatchObject({ position: 2, drag: null, pressed: false });

    // The click the pointer makes after the drag does not follow a link
    // again.
    const late = fireEvent.click(track, { detail: 1 });
    expect(late).toBe(false);
    expect(followed).toEqual(["/settings"]);
  });

  it("follows the current tab's link when a drag ends on it", () => {
    const { track, links, followed, at } = renderBar();

    fireEvent.pointerDown(links[0], at(150));
    fireEvent.pointerMove(track, at(250));
    fireEvent.pointerMove(track, at(160));
    fireEvent.pointerUp(track, at(160));
    expect(followed).toEqual(["/home"]);
  });

  it("follows the pressed link once when the press moves less than the drag threshold", () => {
    const { track, links, followed, at } = renderBar();

    fireEvent.pointerDown(links[1], at(250));
    fireEvent.pointerMove(track, at(251));
    fireEvent.pointerUp(links[1], at(251));
    expect(followed).toEqual([]);
    fireEvent.click(links[1], { detail: 1 });
    expect(followed).toEqual(["/activity"]);
  });

  it("returns to the current tab when the pointer is cancelled", () => {
    const { track, links, liquid, followed, at } = renderBar();

    fireEvent.pointerDown(links[1], at(250));
    fireEvent.pointerMove(track, at(350));
    fireEvent.pointerCancel(track, at(350));
    expect(liquid()).toMatchObject({ position: 0, drag: null, pressed: false });
    expect(followed).toEqual([]);
  });

  it('moves the plain indicator with a drag under effect="none"', () => {
    const { track, links, at } = renderBar({ effect: "none" });
    const indicator = screen.getByRole("list").previousElementSibling;
    const style = () => indicator?.getAttribute("style") ?? "";
    const before = style();

    fireEvent.pointerDown(links[0], at(150));
    fireEvent.pointerMove(track, at(200));
    expect(style()).toContain("50px");
    expect(style()).toContain("150px");

    fireEvent.pointerUp(track, at(200));
    expect(style()).toBe(before);
  });

  it("moves to the tab that the keyboard follows, with no press", async () => {
    const user = userEvent.setup();
    const { links, liquid, followed } = renderBar();

    links[1].focus();
    await user.keyboard("{Enter}");
    expect(followed).toEqual(["/activity"]);
    expect(liquid()).toMatchObject({ position: 1, pressed: false });
  });
});
