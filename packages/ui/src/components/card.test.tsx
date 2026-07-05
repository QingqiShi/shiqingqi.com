import * as stylex from "@stylexjs/stylex";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Card } from "./card.tsx";

describe("Card rendering", () => {
  it("renders its children", () => {
    render(<Card>Panel body</Card>);
    expect(screen.getByText("Panel body")).toBeInTheDocument();
  });

  it("applies the bordered surface by default", () => {
    render(<Card data-testid="card">Body</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("styles.base");
    expect(card.className).toContain("cardSurface.base");
  });

  it("stays static without the interactive prop", () => {
    render(<Card data-testid="card">Body</Card>);
    expect(screen.getByTestId("card").className).not.toContain(
      "cardSurface.interactive",
    );
  });

  it("adds hover affordances when interactive", () => {
    render(
      <Card interactive data-testid="card">
        Body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("cardSurface.interactive");
    expect(card.className).toContain("transition.colors");
  });
});

describe("Card prop forwarding", () => {
  it("merges className and forwards style", () => {
    render(
      <Card data-testid="card" className="extra" style={{ margin: 4 }}>
        Body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card.className).toContain("extra");
    expect(card).toHaveStyle({ margin: "4px" });
  });

  it("forwards native attributes and events", () => {
    const onClick = vi.fn();
    render(
      <Card data-testid="card" id="alert" role="alert" onClick={onClick}>
        Body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("id", "alert");
    expect(card).toHaveAttribute("role", "alert");
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards a ref to the underlying div", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Card
        ref={(element) => {
          node = element;
        }}
      >
        Body
      </Card>,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <Card css={overrides.box} data-testid="card">
        Body
      </Card>,
    );
    expect(screen.getByTestId("card").className).toContain("overrides.box");
  });
});
