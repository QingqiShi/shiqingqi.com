import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import type { TabBarLinkProps } from "../actions/tab-bar.tsx";
import { TabView } from "./tab-view.tsx";

function renderView(props?: Partial<ComponentProps<typeof TabView>>) {
  return render(
    <TabView
      label="App"
      items={[
        { href: "/", label: "Home", icon: HouseIcon, current: true },
        {
          href: "/search",
          label: "Search",
          icon: MagnifyingGlassIcon,
          badge: <span data-testid="dot" />,
          status: "New results",
        },
      ]}
      {...props}
    >
      Screen
    </TabView>,
  );
}

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
});
