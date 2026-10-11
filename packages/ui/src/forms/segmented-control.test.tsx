import * as stylex from "@stylexjs/stylex";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createEffectRegistry } from "../effect-layer/create-effect-registry.ts";
import { EffectLayerContext } from "../effect-layer/effect-layer-context.ts";
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

describe("SegmentedControl liquid effect", () => {
  function renderLiquid(effect?: "liquid" | "none") {
    const registry = createEffectRegistry();
    function LiquidHarness() {
      const [value, setValue] = useState<"daily" | "overview">("daily");
      return (
        <SegmentedControl
          aria-label="View"
          options={OPTIONS}
          value={value}
          onChange={setValue}
          effect={effect}
        />
      );
    }
    render(
      <EffectLayerContext value={registry.register}>
        <LiquidHarness />
      </EffectLayerContext>,
    );
    const track = screen.getByRole("radiogroup");
    const liquid = () => registry.elements().get(track)?.settings.liquid;
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 50, width: 200, height: 40 }),
    );
    return { track, liquid };
  }

  it("draws the indicator as liquid by default, resting on the selected segment", () => {
    const { track, liquid } = renderLiquid();
    expect(liquid()).toMatchObject({
      position: 0,
      pressed: false,
      aim: 0,
    });
    expect(track.querySelector("[data-liquid-indicator]")).toBe(
      track.firstElementChild,
    );
  });

  it("pours to the segment a click selects, aimed at where it was pressed", () => {
    const { liquid } = renderLiquid();
    const overview = screen.getByRole("radio", { name: "Overview" });
    const press = {
      pointerId: 1,
      clientY: 54,
      button: 0,
      pointerType: "mouse",
    };

    fireEvent.pointerDown(overview, press);
    expect(liquid()).toMatchObject({ position: 1, pressed: true });
    expect(liquid()?.aim).toBeCloseTo(-0.8);

    fireEvent.pointerUp(overview, press);
    fireEvent.click(overview, { detail: 1 });
    expect(liquid()).toMatchObject({ position: 1, pressed: false });
    expect(liquid()?.aim).toBeCloseTo(-0.8);
  });

  it("thaws only while a press is on the track", () => {
    const { track, liquid } = renderLiquid();
    fireEvent.pointerDown(track, {
      pointerId: 1,
      clientY: 70,
      button: 0,
      pointerType: "touch",
    });
    expect(liquid()?.pressed).toBe(true);
    fireEvent.pointerLeave(track, { pointerId: 1, pointerType: "touch" });
    expect(liquid()?.pressed).toBe(false);
    fireEvent.pointerDown(track, {
      pointerId: 1,
      clientY: 70,
      button: 2,
      pointerType: "mouse",
    });
    expect(liquid()?.pressed).toBe(false);
  });

  it("aims a selection by arrow key at the centre line", async () => {
    const user = userEvent.setup();
    const { track, liquid } = renderLiquid();
    fireEvent.pointerDown(track, {
      pointerId: 1,
      clientY: 88,
      button: 0,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(track, {
      pointerId: 1,
      clientY: 88,
      button: 0,
      pointerType: "mouse",
    });
    expect(liquid()?.aim).toBeCloseTo(0.9);

    screen.getByRole("radio", { name: "Daily" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(liquid()).toMatchObject({ position: 1, aim: 0 });
  });

  it('draws no effect with effect="none"', () => {
    const { liquid } = renderLiquid("none");
    expect(liquid()).toBeUndefined();
  });
});

describe("SegmentedControl drag", () => {
  const THREE = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ] as const;
  type Three = (typeof THREE)[number]["value"];

  // jsdom has no pointer capture. A real browser routes the pointer to the
  // track; the events here go to the track already.
  if (!("setPointerCapture" in HTMLElement.prototype)) {
    Object.assign(HTMLElement.prototype, { setPointerCapture() {} });
  }

  /**
   * Three segments of `widths` from x = 100 on a 40px track, starting on
   * `day`. jsdom lays nothing out, so each box is given.
   */
  function renderDrag({
    effect,
    disabled,
    widths = [100, 100, 100],
  }: {
    effect?: "liquid" | "none";
    disabled?: boolean;
    widths?: readonly number[];
  } = {}) {
    const registry = createEffectRegistry();
    const onChange = vi.fn();
    function DragHarness() {
      const [value, setValue] = useState<Three>("day");
      return (
        <fieldset disabled={disabled}>
          <SegmentedControl
            aria-label="Range"
            options={THREE}
            value={value}
            onChange={(next) => {
              onChange(next);
              setValue(next);
            }}
            effect={effect}
          />
        </fieldset>
      );
    }
    render(
      <EffectLayerContext value={registry.register}>
        <DragHarness />
      </EffectLayerContext>,
    );
    const track = screen.getByRole("radiogroup");
    const width = widths.reduce((sum, each) => sum + each, 0);
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 50, width, height: 40 }),
    );
    vi.spyOn(track, "clientWidth", "get").mockReturnValue(width);
    const segments = screen.getAllByRole("radio");
    segments.forEach((segment, index) => {
      vi.spyOn(segment, "getBoundingClientRect").mockReturnValue(
        DOMRect.fromRect({
          x: 100 + widths.slice(0, index).reduce((sum, each) => sum + each, 0),
          y: 50,
          width: widths[index],
          height: 40,
        }),
      );
    });
    const liquid = () => registry.elements().get(track)?.settings.liquid;
    const at = (clientX: number, clientY = 70) => ({
      pointerId: 1,
      clientX,
      clientY,
      button: 0,
      pointerType: "mouse",
    });
    return { track, segments, liquid, onChange, at };
  }

  it("moves the liquid at once to the segment a press is on", () => {
    const { segments, liquid, onChange, at } = renderDrag();
    fireEvent.pointerDown(segments[2], at(350));
    expect(liquid()).toMatchObject({ position: 2, drag: null, pressed: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(segments[0]).toBeChecked();
  });

  it("drags from a press on a segment that is not selected", () => {
    const { track, segments, liquid, onChange, at } = renderDrag();
    const [, week, month] = segments;

    fireEvent.pointerDown(week, at(250));
    fireEvent.pointerMove(track, at(251));
    expect(liquid()).toMatchObject({ position: 1, drag: null });

    fireEvent.pointerMove(track, at(300));
    expect(liquid()?.drag).toBeCloseTo(1.5);

    fireEvent.pointerMove(track, at(900));
    expect(liquid()?.drag).toBe(2);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(track, at(900, 54));
    fireEvent.click(month, { detail: 1 });
    expect(onChange).toHaveBeenCalledExactlyOnceWith("month");
    expect(liquid()).toMatchObject({ position: 2, drag: null, pressed: false });
    expect(liquid()?.aim).toBeCloseTo(-0.8);
    expect(month).toBeChecked();
  });

  it("selects the segment under the indicator's centre on release", () => {
    const { track, segments, onChange, at } = renderDrag({
      widths: [100, 200, 60],
    });
    // The centres are at 150, 300 and 430. At 410 the indicator is mostly
    // over `week`, but its centre is over `month`.
    fireEvent.pointerDown(segments[0], at(150));
    fireEvent.pointerMove(track, at(410));
    fireEvent.pointerUp(track, at(410));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("month");
  });

  it('keeps the plain indicator as wide as the segments under it under effect="none"', () => {
    const { track, segments, onChange, at } = renderDrag({
      effect: "none",
      widths: [100, 200, 60],
    });
    const indicator = track.firstElementChild;
    const style = () => indicator?.getAttribute("style") ?? "";
    const before = style();

    fireEvent.pointerDown(segments[2], at(430));
    // On the narrow segment: 300px from the start, 0px from the end.
    expect(style()).toContain("300px");
    expect(style()).toContain("0px");

    // Halfway from the centre of `week` to the centre of `month`, the
    // indicator is 130px wide, from 200px to 30px from the end.
    fireEvent.pointerMove(track, at(365));
    expect(style()).toContain("200px");
    expect(style()).toContain("30px");

    fireEvent.pointerUp(track, at(365));
    expect(style()).toBe(before);
    expect(onChange).toHaveBeenCalledExactlyOnceWith("week");
  });

  it("does not select again when the drag ends on the selected segment", () => {
    const { track, segments, liquid, onChange, at } = renderDrag();
    const [day] = segments;
    fireEvent.pointerDown(day, at(150));
    fireEvent.pointerMove(track, at(190));
    fireEvent.pointerUp(day, at(190));
    fireEvent.click(day, { detail: 1 });
    expect(onChange).not.toHaveBeenCalled();
    expect(liquid()).toMatchObject({ position: 0, drag: null });
  });

  it("selects the segment a tap is on, the selected one too", () => {
    const { track, segments, onChange, at } = renderDrag();
    const [day, week] = segments;
    fireEvent.pointerDown(week, at(250));
    fireEvent.pointerMove(track, at(251));
    fireEvent.pointerUp(week, at(251));
    fireEvent.click(week, { detail: 1 });
    expect(onChange).toHaveBeenCalledExactlyOnceWith("week");
    expect(week).toBeChecked();

    fireEvent.pointerDown(week, at(250));
    fireEvent.pointerUp(week, at(250));
    fireEvent.click(week, { detail: 1 });
    expect(onChange).toHaveBeenLastCalledWith("week");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(day).not.toBeChecked();
  });

  it("shows the segment under the indicator as selected until the release", () => {
    const { track, segments, onChange, at } = renderDrag();
    const [day, week, month] = segments;
    const looksSelected = () =>
      segments.map((segment) => segment.className.includes("optionSelected"));

    fireEvent.pointerDown(week, at(250));
    expect(looksSelected()).toEqual([false, true, false]);
    expect(day).toBeChecked();

    fireEvent.pointerMove(track, at(350));
    expect(looksSelected()).toEqual([false, false, true]);
    expect(day).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(track, at(350));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("month");
    expect(looksSelected()).toEqual([false, false, true]);
    expect(month).toBeChecked();
  });

  it("shows the selected segment again when the pointer is cancelled", () => {
    const { track, segments, at } = renderDrag();
    fireEvent.pointerDown(segments[1], at(250));
    fireEvent.pointerMove(track, at(350));
    fireEvent.pointerCancel(track, at(350));
    expect(
      segments.map((segment) => segment.className.includes("optionSelected")),
    ).toEqual([true, false, false]);
  });

  it("returns to the previous value when the pointer is cancelled", () => {
    const { track, segments, liquid, onChange, at } = renderDrag();
    fireEvent.pointerDown(segments[1], at(250));
    expect(liquid()?.position).toBe(1);
    fireEvent.pointerMove(track, at(350));
    expect(liquid()?.drag).toBe(2);
    fireEvent.pointerCancel(track, at(350));
    expect(onChange).not.toHaveBeenCalled();
    expect(liquid()).toMatchObject({ position: 0, drag: null, pressed: false });
    expect(segments[0]).toBeChecked();
  });

  it("does not drag a disabled control", () => {
    const { track, segments, liquid, onChange, at } = renderDrag({
      disabled: true,
    });
    fireEvent.pointerDown(segments[1], at(250));
    expect(liquid()?.position).toBe(0);
    fireEvent.pointerMove(track, at(350));
    fireEvent.pointerUp(track, at(350));
    expect(liquid()?.drag).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaves the keys as they are after a drag", async () => {
    const user = userEvent.setup();
    const { track, segments, onChange, at } = renderDrag();
    fireEvent.pointerDown(segments[0], at(150));
    fireEvent.pointerMove(track, at(250));
    fireEvent.pointerUp(track, at(250));
    segments[1].focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("month");
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
