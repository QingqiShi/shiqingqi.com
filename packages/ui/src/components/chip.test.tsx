import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "./chip.tsx";

describe("Chip element choice", () => {
  it("renders a button by default", () => {
    render(<Chip>Day 1</Chip>);

    const chip = screen.getByRole("button", { name: "Day 1" });
    expect(chip).toHaveAttribute("type", "button");
  });

  it("renders a link when href is set", () => {
    render(<Chip href="https://maps.example/place">Colosseum</Chip>);

    expect(screen.getByRole("link", { name: "Colosseum" })).toHaveAttribute(
      "href",
      "https://maps.example/place",
    );
  });

  it("forwards anchor attributes", () => {
    render(
      <Chip href="/place" target="_blank" rel="noreferrer noopener">
        Colosseum
      </Chip>,
    );

    const link = screen.getByRole("link", { name: "Colosseum" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("forwards button attributes and events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Chip onClick={onClick} disabled data-testid="chip">
        Day 1
      </Chip>,
    );

    const chip = screen.getByTestId("chip");
    expect(chip).toBeDisabled();

    await user.click(chip);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Chip state", () => {
  it("emits aria-pressed on the button form when active", () => {
    render(<Chip isActive>Day 1</Chip>);

    expect(screen.getByRole("button", { name: "Day 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("omits aria-pressed when isActive is not set", () => {
    render(<Chip>Day 1</Chip>);

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("never puts aria-pressed on the link form", () => {
    render(
      <Chip href="/day/1" isActive>
        Day 1
      </Chip>,
    );

    expect(screen.getByRole("link")).not.toHaveAttribute("aria-pressed");
  });

  it("applies the active surface when active", () => {
    render(
      <Chip isActive data-testid="chip">
        Day 1
      </Chip>,
    );

    expect(screen.getByTestId("chip").className).toContain(
      "chipSurface.active",
    );
  });
});

describe("Chip slots", () => {
  it("hides the icon from the accessibility tree", () => {
    render(<Chip icon={<span data-testid="icon" />}>Navigate</Chip>);

    expect(screen.getByTestId("icon").parentElement).toHaveAttribute(
      "aria-hidden",
    );
    expect(
      screen.getByRole("button", { name: "Navigate" }),
    ).toBeInTheDocument();
  });

  it("keeps trailing content in the accessible name", () => {
    render(<Chip trailing="· 2 min">Colosseum</Chip>);

    // Name-from-content concatenates the inline runs without inserting a
    // separator, so the trailing note joins the label directly.
    expect(
      screen.getByRole("button", { name: "Colosseum· 2 min" }),
    ).toBeInTheDocument();
  });

  it("drops the muted trailing colour on the selected fill", () => {
    const { rerender } = render(<Chip trailing="12">Watchlist</Chip>);

    const trailingOf = () =>
      screen.getByRole("button").querySelector("span:last-of-type");
    // Resting: set back a step with the muted token.
    expect(trailingOf()?.className).not.toContain("styles.trailingActive");

    rerender(
      <Chip isActive trailing="12">
        Watchlist
      </Chip>,
    );

    // Active: accentOn on accent only just clears 4.5:1, so muting the trailing
    // content there would push it under the contrast floor.
    expect(trailingOf()?.className).toContain("styles.trailingActive");
  });

  it("omits the trailing slot when it resolves to nothing", () => {
    function Place({ minutes }: { minutes: number }) {
      return (
        <Chip trailing={minutes && `· ${String(minutes)} min`}>Forum</Chip>
      );
    }
    render(<Place minutes={0} />);

    expect(screen.getByRole("button", { name: "Forum" })).toBeInTheDocument();
  });
});

describe("Chip styling", () => {
  it("composes the shared chip surface", () => {
    render(<Chip data-testid="chip">Day 1</Chip>);

    const className = screen.getByTestId("chip").className;
    expect(className).toContain("chipSurface.base");
    expect(className).toContain("chipSurface.interactive");
    expect(className).toContain("chipSize.md");
  });

  it("applies the small size step", () => {
    render(
      <Chip size="sm" data-testid="chip">
        Day 1
      </Chip>,
    );

    expect(screen.getByTestId("chip").className).toContain("chipSize.sm");
  });

  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <Chip css={overrides.box} data-testid="chip">
        Day 1
      </Chip>,
    );

    expect(screen.getByTestId("chip").className).toContain("overrides.box");
  });
});
