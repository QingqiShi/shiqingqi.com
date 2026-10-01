import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./segmented-control.tsx";

const ICON_OPTIONS = [
  {
    value: "grid",
    label: "Grid",
    icon: <span data-testid="icon-grid">▦</span>,
  },
  {
    value: "list",
    label: "List",
    icon: <span data-testid="icon-list">☰</span>,
  },
] as const;

const OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "overview", label: "Overview" },
] as const;

function Harness({ initial = "daily" }: { initial?: "daily" | "overview" }) {
  const [value, setValue] = useState<"daily" | "overview">(initial);
  return (
    <SegmentedControl
      aria-label="View"
      options={OPTIONS}
      value={value}
      onChange={setValue}
    />
  );
}

describe("SegmentedControl", () => {
  it("renders a named radiogroup of radio options", () => {
    render(<Harness />);

    const group = screen.getByRole("radiogroup", { name: "View" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("renders the indicator as one decorative element, not an option", () => {
    render(<Harness />);

    const track = screen.getByRole("radiogroup");
    const indicator = track.firstElementChild;

    expect(indicator).toHaveAttribute("aria-hidden", "true");
    expect(indicator).not.toHaveAttribute("role");
    expect(indicator).not.toHaveAttribute("tabindex");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("renders no indicator when there are no options", () => {
    render(
      <SegmentedControl
        aria-label="View"
        options={[]}
        value="daily"
        onChange={vi.fn()}
      />,
    );

    const track = screen.getByRole("radiogroup");
    expect(track.firstElementChild).toBeNull();
  });

  it("leaves the roving tabindex to the options", () => {
    render(<Harness initial="overview" />);

    const track = screen.getByRole("radiogroup");
    const focusable = track.querySelectorAll('[tabindex="0"]');

    expect(focusable).toHaveLength(1);
    expect(focusable[0]).toBe(screen.getByRole("radio", { name: "Overview" }));
  });

  it("marks the selected option as checked", () => {
    render(<Harness initial="overview" />);

    expect(screen.getByRole("radio", { name: "Daily" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("radio", { name: "Overview" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("selects an option on click", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("radio", { name: "Overview" }));

    expect(screen.getByRole("radio", { name: "Overview" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("moves selection with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Daily" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: "Overview" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Overview" })).toHaveFocus();
  });

  it("keeps only the selected option in the tab sequence", () => {
    render(<Harness initial="overview" />);

    expect(screen.getByRole("radio", { name: "Daily" })).toHaveAttribute(
      "tabIndex",
      "-1",
    );
    expect(screen.getByRole("radio", { name: "Overview" })).toHaveAttribute(
      "tabIndex",
      "0",
    );
  });

  it("calls onChange with the next value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="View"
        options={OPTIONS}
        value="daily"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Overview" }));

    expect(onChange).toHaveBeenCalledWith("overview");
  });

  it("keeps a decorative icon out of the option's accessible name", () => {
    render(
      <SegmentedControl
        aria-label="View"
        options={[{ value: "daily", label: "Daily", icon: <span>★</span> }]}
        value="daily"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: "Daily" })).toBeInTheDocument();
  });

  it("lets an option's aria-label replace its visible label as the name", () => {
    render(
      <SegmentedControl
        aria-label="Sort"
        options={[
          {
            value: "popularity",
            label: "Popularity ↓",
            "aria-label": "Popularity, descending. Activate to sort ascending.",
          },
          { value: "rating", label: "Rating" },
        ]}
        value="popularity"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("radio", {
        name: "Popularity, descending. Activate to sort ascending.",
      }),
    ).toHaveTextContent("Popularity ↓");
    expect(screen.getByRole("radio", { name: "Rating" })).toBeInTheDocument();
  });

  it("names the group from aria-labelledby", () => {
    render(
      <>
        <h2 id="view-heading">Trip view</h2>
        <SegmentedControl
          aria-labelledby="view-heading"
          options={OPTIONS}
          value="daily"
          onChange={vi.fn()}
        />
      </>,
    );

    expect(
      screen.getByRole("radiogroup", { name: "Trip view" }),
    ).toBeInTheDocument();
  });

  it("does not submit an enclosing form", () => {
    const onSubmit = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <SegmentedControl
          aria-label="View"
          options={OPTIONS}
          value="daily"
          onChange={vi.fn()}
        />
      </form>,
    );

    // Without an explicit type a <button> defaults to type="submit", so picking
    // a view would reload the page and lose the form's contents.
    for (const segment of screen.getAllByRole("radio")) {
      expect(segment).toHaveAttribute("type", "button");
    }
  });

  it("stays reachable by keyboard when the value matches no option", async () => {
    const user = userEvent.setup();
    // Widened to `string` so the drifted value is expressible — which is the
    // shape a value read from a query param arrives in anyway.
    const options = [
      { value: "daily", label: "Daily" },
      { value: "overview", label: "Overview" },
    ];
    render(
      <SegmentedControl
        aria-label="View"
        options={options}
        // A stale query param, or options that arrived after the value.
        value="table"
        onChange={vi.fn()}
      />,
    );

    // WAI-ARIA: with nothing checked the first option keeps the group in the
    // tab order. Otherwise every segment is tabIndex=-1 and focus can never
    // land inside, so the arrow keys have nothing to work from either.
    await user.tab();
    expect(screen.getAllByRole("radio")[0]).toHaveFocus();

    // Nothing carries the anchor, so the indicator would land at the start of
    // the track at its own size instead of over an option.
    expect(
      screen.getByRole("radiogroup").querySelectorAll("[aria-hidden]"),
    ).toHaveLength(0);
  });

  it("forwards native div attributes to the track", () => {
    render(
      <SegmentedControl
        aria-label="View"
        options={OPTIONS}
        value="daily"
        onChange={vi.fn()}
        id="view-switch"
        data-testid="view-switch"
        title="Switch view"
      />,
    );

    const track = screen.getByTestId("view-switch");
    expect(track).toHaveAttribute("id", "view-switch");
    expect(track).toHaveAttribute("title", "Switch view");
  });

  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <SegmentedControl
        aria-label="View"
        options={OPTIONS}
        value="daily"
        onChange={vi.fn()}
        css={overrides.box}
      />,
    );

    expect(screen.getByRole("radiogroup").className).toContain("overrides.box");
  });

  it("calls onChange with the same value when clicking the already-selected segment", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="View"
        options={OPTIONS}
        value="daily"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Daily" }));

    expect(onChange).toHaveBeenCalledWith("daily");
  });
});

describe("SegmentedControl selectedIcon", () => {
  const SORT_OPTIONS = [
    {
      value: "popularity",
      label: "Popularity",
      selectedIcon: <span data-testid="arrow-popularity">↓</span>,
    },
    {
      value: "rating",
      label: "Rating",
      selectedIcon: <span data-testid="arrow-rating">↓</span>,
    },
  ] as const;

  it("renders the icon inside every option that supplies one", () => {
    render(
      <SegmentedControl
        aria-label="Sort"
        options={SORT_OPTIONS}
        value="popularity"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: "Popularity" })).toContainElement(
      screen.getByTestId("arrow-popularity"),
    );
    expect(screen.getByRole("radio", { name: "Rating" })).toContainElement(
      screen.getByTestId("arrow-rating"),
    );
  });

  it("keeps the icon out of the option's accessible name", () => {
    render(
      <SegmentedControl
        aria-label="Sort"
        options={SORT_OPTIONS}
        value="popularity"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("arrow-popularity").closest("[aria-hidden]"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Popularity" }),
    ).toBeInTheDocument();
  });

  it("opens the icon's spot on the selected option only", () => {
    render(
      <SegmentedControl
        aria-label="Sort"
        options={SORT_OPTIONS}
        value="popularity"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("arrow-popularity").closest("[aria-hidden]")
        ?.className,
    ).toContain("selectedIconSpotShown");
    expect(
      screen.getByTestId("arrow-rating").closest("[aria-hidden]")?.className,
    ).not.toContain("selectedIconSpotShown");
  });

  it("renders no spot for an option that supplies no icon", () => {
    render(
      <SegmentedControl
        aria-label="Sort"
        options={[
          {
            value: "popularity",
            label: "Popularity",
            selectedIcon: <span data-testid="arrow-popularity">↓</span>,
          },
          { value: "rating", label: "Rating" },
        ]}
        value="popularity"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen
        .getByRole("radio", { name: "Rating" })
        .querySelectorAll("[aria-hidden]"),
    ).toHaveLength(0);
    expect(
      screen
        .getByRole("radio", { name: "Popularity" })
        .querySelectorAll("[aria-hidden]"),
    ).toHaveLength(1);
  });
});

describe("SegmentedControl hideLabels", () => {
  it("keeps each option's accessible name when the label is visually hidden", () => {
    render(
      <SegmentedControl
        aria-label="View"
        options={ICON_OPTIONS}
        value="grid"
        onChange={vi.fn()}
        hideLabels
      />,
    );

    expect(screen.getByRole("radio", { name: "Grid" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "List" })).toBeInTheDocument();
  });

  it("visually hides the label with a11y.srOnly instead of truncating it", () => {
    render(
      <SegmentedControl
        aria-label="View"
        options={ICON_OPTIONS}
        value="grid"
        onChange={vi.fn()}
        hideLabels
      />,
    );

    const label = screen.getByText("Grid");
    expect(label.className).toContain("a11y.srOnly");
    expect(label.className).not.toContain("truncate.base");
  });

  it("keeps the icon wrapper aria-hidden when labels are hidden", () => {
    render(
      <SegmentedControl
        aria-label="View"
        options={ICON_OPTIONS}
        value="grid"
        onChange={vi.fn()}
        hideLabels
      />,
    );

    expect(screen.getByTestId("icon-grid").parentElement).toHaveAttribute(
      "aria-hidden",
    );
  });
});
