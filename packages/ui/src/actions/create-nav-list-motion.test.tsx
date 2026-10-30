import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { markerTargetOf } from "./create-nav-list-motion.ts";
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
