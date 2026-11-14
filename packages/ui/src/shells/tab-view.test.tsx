import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabView } from "./tab-view.tsx";

describe("TabView", () => {
  // A view with plain links crashed when it had no `linkStatus` at all.
  it("renders plain links without a linkStatus", () => {
    render(
      <TabView
        sidebarToggleLabel="Sidebar"
        label="Main"
        items={[
          { href: "/home", label: "Home", icon: HouseIcon, current: true },
          { href: "/todos", label: "To-dos", icon: HouseIcon, count: 17 },
        ]}
      >
        <p>Screen</p>
      </TabView>,
    );

    expect(screen.getByText("Screen")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "To-dos 17" }).length,
    ).toBeGreaterThan(0);
  });

  // The toggle of an example view also collapsed the sidebar of the page.
  it("collapses only its own sidebar inside another view", () => {
    const items = [
      { href: "/home", label: "Home", icon: HouseIcon, current: true },
    ];
    render(
      <TabView sidebarToggleLabel="Page sidebar" label="Page" items={items}>
        <TabView
          sidebarToggleLabel="Example sidebar"
          label="Example"
          items={items}
          as="div"
        >
          <p>Screen</p>
        </TabView>
      </TabView>,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Example sidebar" })[0],
    );

    for (const toggle of screen.getAllByRole("button", {
      name: "Example sidebar",
    })) {
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    }
    for (const toggle of screen.getAllByRole("button", {
      name: "Page sidebar",
    })) {
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    }
    expect(document.cookie).not.toContain("sidebar_collapsed=1");
  });
});
