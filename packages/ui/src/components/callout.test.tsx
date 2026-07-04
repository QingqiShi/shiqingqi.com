import * as stylex from "@stylexjs/stylex";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Callout } from "./callout.tsx";

describe("Callout rendering", () => {
  it("renders the title and body", () => {
    render(
      <Callout variant="info" title="Heads up">
        Your session will expire soon.
      </Callout>,
    );
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(
      screen.getByText("Your session will expire soon."),
    ).toBeInTheDocument();
  });

  it("renders without a title (body only)", () => {
    render(<Callout variant="neutral">Just a note.</Callout>);
    expect(screen.getByText("Just a note.")).toBeInTheDocument();
  });

  it("renders a built-in decorative glyph marked aria-hidden", () => {
    const { container } = render(<Callout variant="success">Saved.</Callout>);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // The glyph is wrapped in an aria-hidden span.
    expect(svg?.closest("[aria-hidden]")).not.toBeNull();
  });

  it("wraps a custom icon in an aria-hidden slot", () => {
    render(<Callout icon={<span data-testid="glyph">★</span>}>Body</Callout>);
    const glyph = screen.getByTestId("glyph");
    expect(glyph.parentElement).toHaveAttribute("aria-hidden");
  });

  it("drops the icon when icon is null", () => {
    const { container } = render(<Callout icon={null}>No icon here.</Callout>);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("Callout role mapping", () => {
  it("defaults info/success/accent/neutral to role status", () => {
    for (const variant of ["info", "success", "accent", "neutral"] as const) {
      const { unmount } = render(<Callout variant={variant}>Body</Callout>);
      expect(screen.getByRole("status")).toBeInTheDocument();
      unmount();
    }
  });

  it("defaults danger and warning to role alert", () => {
    const { unmount } = render(<Callout variant="danger">Boom</Callout>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    unmount();
    render(<Callout variant="warning">Careful</Callout>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("lets an explicit role override the variant default", () => {
    render(
      <Callout variant="danger" role="status">
        Non-urgent error
      </Callout>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Callout dismiss", () => {
  it("names the dismiss button with dismissLabel and fires onDismiss", () => {
    const onDismiss = vi.fn();
    render(
      <Callout variant="warning" onDismiss={onDismiss} dismissLabel="Dismiss">
        Careful now.
      </Callout>,
    );
    const region = screen.getByRole("alert");
    const button = within(region).getByRole("button", { name: "Dismiss" });
    fireEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders no dismiss button by default", () => {
    render(<Callout variant="info">No close.</Callout>);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Callout prop forwarding", () => {
  it("composes a caller css override", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <Callout css={overrides.box} data-testid="callout">
        Body
      </Callout>,
    );
    expect(screen.getByTestId("callout").className).toContain("overrides.box");
  });

  it("merges a caller className and forwards native attributes", () => {
    render(
      <Callout className="my-callout" id="c1" data-testid="callout">
        Body
      </Callout>,
    );
    const el = screen.getByTestId("callout");
    expect(el.className).toContain("my-callout");
    expect(el).toHaveAttribute("id", "c1");
  });

  it("forwards a ref to the container div", () => {
    const ref: { current: HTMLDivElement | null } = { current: null };
    render(<Callout ref={ref}>Body</Callout>);
    expect(ref.current?.tagName).toBe("DIV");
  });
});
