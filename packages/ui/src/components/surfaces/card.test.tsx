import * as stylex from "@stylexjs/stylex";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card.tsx";

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

describe("Card slots", () => {
  it("renders a title as a real heading", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tuscany</CardTitle>
        </CardHeader>
      </Card>,
    );

    expect(
      screen.getByRole("heading", { name: "Tuscany", level: 3 }),
    ).toBeInTheDocument();
  });

  it("moves the title's rank without changing its size", () => {
    render(
      <CardHeader>
        <CardTitle level={2}>Tuscany</CardTitle>
      </CardHeader>,
    );

    const heading = screen.getByRole("heading", { name: "Tuscany", level: 2 });
    expect(heading.className).toContain("variantStyles.h3");
  });

  it("lets the card name itself from its title", () => {
    render(
      <Card aria-labelledby="tuscany-title">
        <CardHeader>
          <CardTitle id="tuscany-title">Tuscany</CardTitle>
          <CardDescription id="tuscany-desc">Six days</CardDescription>
        </CardHeader>
      </Card>,
    );

    // The named-region pattern needs an id on the title; without one the only
    // way to get it would be to abandon the slot and hand-roll the heading.
    expect(screen.getByRole("heading", { name: "Tuscany" })).toHaveAttribute(
      "id",
      "tuscany-title",
    );
    expect(screen.getByText("Six days")).toHaveAttribute("id", "tuscany-desc");
  });

  it("renders no action slot when the action resolves to nothing", () => {
    function Header({ canEdit }: { canEdit: boolean }) {
      return (
        <CardHeader
          action={canEdit && <button type="button">Edit</button>}
          data-testid="header"
        >
          <CardTitle>Tuscany</CardTitle>
        </CardHeader>
      );
    }
    render(<Header canEdit={false} />);

    // An empty slot would still take the header's gap, narrowing the title on
    // every card without an action.
    expect(screen.getByTestId("header").children).toHaveLength(1);
  });

  it("renders the header action beside the title", () => {
    render(
      <CardHeader action={<button type="button">Edit</button>}>
        <CardTitle>Tuscany</CardTitle>
      </CardHeader>,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("renders description, content, and footer", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tuscany</CardTitle>
          <CardDescription>Seven days by car</CardDescription>
        </CardHeader>
        <CardContent>Day one heads south.</CardContent>
        <CardFooter>
          <button type="button">Open</button>
        </CardFooter>
      </Card>,
    );

    expect(screen.getByText("Seven days by car")).toBeInTheDocument();
    expect(screen.getByText("Day one heads south.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("spaces the blocks off each other without a parent gap", () => {
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle>Tuscany</CardTitle>
        </CardHeader>
        <CardContent data-testid="content">Body</CardContent>
      </Card>,
    );

    // Every block carries the same self-spacing rule; the `:not(:first-child)`
    // condition is what keeps it off the first one.
    expect(screen.getByTestId("header").className).toContain(
      "slotStyles.block",
    );
    expect(screen.getByTestId("content").className).toContain(
      "slotStyles.block",
    );
  });

  it("forwards native attributes and css overrides on each slot", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <Card>
        <CardHeader id="header" css={overrides.box}>
          <CardTitle css={overrides.box}>Tuscany</CardTitle>
          <CardDescription css={overrides.box}>Seven days</CardDescription>
        </CardHeader>
        <CardContent id="content" css={overrides.box}>
          Body
        </CardContent>
        <CardFooter id="footer" css={overrides.box}>
          Footer
        </CardFooter>
      </Card>,
    );

    for (const id of ["header", "content", "footer"]) {
      expect(document.getElementById(id)?.className).toContain("overrides.box");
    }
    expect(screen.getByRole("heading").className).toContain("overrides.box");
    expect(screen.getByText("Seven days").className).toContain("overrides.box");
  });
});
