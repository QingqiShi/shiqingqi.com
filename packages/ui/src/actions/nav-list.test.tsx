import * as stylex from "@stylexjs/stylex";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavGroup } from "./nav-group.tsx";
import { NavLink } from "./nav-link.tsx";
import { NavList, type NavListLinkProps } from "./nav-list.tsx";

function RouterLink(props: NavListLinkProps) {
  return <a data-router {...props} />;
}

describe("NavList", () => {
  it("renders its links as a list that takes no gap", () => {
    render(
      <nav aria-label="Finance">
        <NavList>
          <NavLink href="/a">Accounts</NavLink>
          <NavLink href="/b">Reports</NavLink>
        </NavList>
      </nav>,
    );
    const list = screen.getByRole("list");
    expect(list.className).toContain("stack.rows");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute(
      "href",
      "/a",
    );
  });

  it("renders every link through linkComponent, in groups too", () => {
    render(
      <NavList linkComponent={RouterLink}>
        <NavLink href="/a">A</NavLink>
        <NavGroup label="Section">
          <NavGroup label="Category">
            <NavLink href="/b">B</NavLink>
          </NavGroup>
        </NavGroup>
      </NavList>,
    );
    for (const name of ["A", "B"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("data-router");
    }
  });

  it("composes a caller css", () => {
    const overrides = stylex.create({ wide: { minInlineSize: "12rem" } });
    render(
      <NavList css={overrides.wide}>
        <NavLink href="/a">A</NavLink>
      </NavList>,
    );
    expect(screen.getByRole("list").className).toContain("overrides.wide");
  });
});

describe("NavLink", () => {
  it("marks the current page and gives it the selected look", () => {
    render(
      <NavList>
        <NavLink href="/a" current>
          A
        </NavLink>
        <NavLink href="/b">B</NavLink>
      </NavList>,
    );
    const current = screen.getByRole("link", { name: "A" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.className).toContain("selected.quiet");
    expect(current.className).toContain("a11y.touchRow");
    expect(screen.getByRole("link", { name: "B" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("puts leading before the name, inside the link", () => {
    render(
      <NavList>
        <NavLink href="/a" leading={<svg data-testid="icon" />}>
          Accounts
        </NavLink>
      </NavList>,
    );
    const link = screen.getByRole("link", { name: "Accounts" });
    const icon = screen.getByTestId("icon");
    expect(link.contains(icon)).toBe(true);
    expect(link.firstElementChild?.contains(icon)).toBe(true);
  });
});

describe("NavGroup", () => {
  it("names a labelled group by its label", () => {
    render(
      <NavList>
        <NavGroup label="Foundations">
          <NavLink href="/a">Colour</NavLink>
        </NavGroup>
      </NavList>,
    );
    const group = screen.getByRole("group", { name: "Foundations" });
    expect(within(group).getByRole("link", { name: "Colour" })).toBeVisible();
  });

  it("renders no group role without a label", () => {
    render(
      <NavList>
        <NavGroup>
          <NavLink href="/a">Overview</NavLink>
        </NavGroup>
      </NavList>,
    );
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByRole("link", { name: "Overview" })).toBeVisible();
  });

  it("styles the label and the space by depth", () => {
    render(
      <NavList>
        <NavGroup>
          <NavLink href="/">Overview</NavLink>
        </NavGroup>
        <NavGroup label="Components">
          <NavGroup label="Actions">
            <NavLink href="/a">Button</NavLink>
          </NavGroup>
          <NavGroup label="Forms">
            <NavLink href="/b">Switch</NavLink>
          </NavGroup>
        </NavGroup>
      </NavList>,
    );
    const outer = screen.getByRole("group", { name: "Components" });
    const inner = screen.getByRole("group", { name: "Actions" });
    expect(screen.getByText("Components").className).toContain(
      "typeRole.overline",
    );
    expect(screen.getByText("Actions").className).toContain("typeRole.caption");
    expect(outer.parentElement?.className).toContain("styles.outer");
    expect(inner.parentElement?.className).toContain("styles.innerUnderLabel");
  });
});
