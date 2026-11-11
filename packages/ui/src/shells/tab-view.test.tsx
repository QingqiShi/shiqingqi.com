import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabView } from "./tab-view.tsx";

describe("TabView", () => {
  // A view with plain links crashed when it had no `linkStatus` at all.
  it("renders plain links without a linkStatus", () => {
    render(
      <TabView
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
});
