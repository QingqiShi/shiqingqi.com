import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "./breadcrumb.tsx";

const trail = [
  { label: "Home", href: "/" },
  { label: "Guides", href: "/guides" },
  { label: "Plan 2 repayment" },
];

describe("Breadcrumb crumbs", () => {
  it("links the crumbs that have an href", () => {
    render(<Breadcrumb items={trail} label="Breadcrumb" />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Guides" })).toHaveAttribute(
      "href",
      "/guides",
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("keeps the trailing crumb inert even when it carries an href", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Plan 2 repayment", href: "/guides/plan-2" },
        ]}
        label="Breadcrumb"
      />,
    );

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("Plan 2 repayment")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
