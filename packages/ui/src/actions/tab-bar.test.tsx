import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEffectRegistry } from "../effect-layer/create-effect-registry.ts";
import { EffectLayerContext } from "../effect-layer/effect-layer-context.ts";
import { TabBar, type TabBarItem, type TabBarLinkProps } from "./tab-bar.tsx";

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
});

describe("TabBar drag", () => {
  // jsdom has no pointer capture. A real browser routes the pointer to the
  // track; the events here go to the track already.
  if (!("setPointerCapture" in HTMLElement.prototype)) {
    Object.assign(HTMLElement.prototype, { setPointerCapture() {} });
  }

  /**
   * Three 100px tabs from x = 100 on a 64px track. jsdom lays nothing out,
   * so each box is given.
   */
  function renderBar() {
    const followed: string[] = [];
    render(
      <EffectLayerContext value={createEffectRegistry()}>
        <TabBar
          label="Main"
          items={itemsAt(0)}
          linkComponent={recordingLink(followed)}
        />
      </EffectLayerContext>,
    );
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
    const at = (clientX: number, clientY = 82) => ({
      pointerId: 1,
      clientX,
      clientY,
      button: 0,
      pointerType: "mouse",
    });
    return { track, links, followed, at };
  }

  it("drags the indicator across the tabs and follows the link under it on release", () => {
    const { track, links, followed, at } = renderBar();

    fireEvent.pointerDown(links[0], at(150));
    fireEvent.pointerMove(track, at(151));

    fireEvent.pointerMove(track, at(200));

    fireEvent.pointerMove(track, at(330));
    expect(followed).toEqual([]);

    fireEvent.pointerUp(track, at(330));
    expect(followed).toEqual(["/settings"]);

    // The click the pointer makes after the drag does not follow a link
    // again.
    const late = fireEvent.click(track, { detail: 1 });
    expect(late).toBe(false);
    expect(followed).toEqual(["/settings"]);
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
});
