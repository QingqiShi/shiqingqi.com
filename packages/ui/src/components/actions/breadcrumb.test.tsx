import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "./breadcrumb.tsx";

const trail = [
  { label: "Home", href: "/" },
  { label: "Guides", href: "/guides" },
  { label: "Plan 2 repayment" },
];

describe("Breadcrumb structure", () => {
  it("names the nav landmark with the given label", () => {
    render(<Breadcrumb items={trail} label="Breadcrumb" />);

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument();
  });

  it("renders one list item per crumb", () => {
    render(<Breadcrumb items={trail} label="Breadcrumb" />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders nothing for an empty trail", () => {
    render(<Breadcrumb items={[]} label="Breadcrumb" />);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

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

  it("marks the trailing crumb as the current page without linking it", () => {
    render(<Breadcrumb items={trail} label="Breadcrumb" />);

    const current = screen.getByText("Plan 2 repayment");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).toBe("SPAN");
    expect(
      screen.queryByRole("link", { name: "Plan 2 repayment" }),
    ).not.toBeInTheDocument();
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

  it("renders a non-trailing crumb without an href as plain text", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Guides" },
          { label: "Plan 2 repayment" },
        ]}
        label="Breadcrumb"
      />,
    );

    const guides = screen.getByText("Guides");
    expect(guides.tagName).toBe("SPAN");
    expect(guides).not.toHaveAttribute("aria-current");
  });
});

describe("Breadcrumb separator", () => {
  it("hides the separators from the accessibility tree", () => {
    render(<Breadcrumb items={trail} label="Breadcrumb" separator="/" />);

    const separators = screen.getAllByText("/");
    expect(separators).toHaveLength(2);
    for (const separator of separators) {
      expect(separator).toHaveAttribute("aria-hidden");
    }
  });

  it("hides the default chevron from the accessibility tree", () => {
    const { container } = render(
      <Breadcrumb items={trail} label="Breadcrumb" />,
    );

    const chevrons = container.querySelectorAll("svg");
    expect(chevrons).toHaveLength(2);
    for (const chevron of chevrons) {
      expect(chevron.parentElement).toHaveAttribute("aria-hidden");
    }
  });
});

describe("Breadcrumb link Slot", () => {
  function TestLink({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) {
    return (
      <a data-testid="framework-link" href={href} className={className}>
        {children}
      </a>
    );
  }

  it("renders a supplied link component and passes it the href", () => {
    render(
      <Breadcrumb items={trail} label="Breadcrumb" linkComponent={TestLink} />,
    );

    const links = screen.getAllByTestId("framework-link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/");
    expect(links[1]).toHaveAttribute("href", "/guides");
  });

  it("hands the crumb's styles to the supplied link component", () => {
    render(
      <Breadcrumb items={trail} label="Breadcrumb" linkComponent={TestLink} />,
    );

    expect(screen.getAllByTestId("framework-link")[0]?.className).toContain(
      "styles.link",
    );
  });
});

describe("Breadcrumb styling", () => {
  it("composes a caller css override onto the nav", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(<Breadcrumb items={trail} label="Breadcrumb" css={overrides.box} />);

    expect(screen.getByRole("navigation").className).toContain("overrides.box");
  });
});
