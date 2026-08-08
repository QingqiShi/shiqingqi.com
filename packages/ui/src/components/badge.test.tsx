import * as stylex from "@stylexjs/stylex";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./badge.tsx";

describe("Badge rendering", () => {
  it("renders its children inside a span with StyleX classes", () => {
    render(<Badge>Live</Badge>);
    const badge = screen.getByText("Live");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.className).toBeTruthy();
    expect(badge.className).toContain("styles.base");
  });

  it("applies distinct classes per variant", () => {
    const { container: def } = render(<Badge>Default</Badge>);
    const { container: neutral } = render(<Badge variant="neutral">N</Badge>);
    const defSpan = def.querySelector("span");
    const neutralSpan = neutral.querySelector("span");
    expect(defSpan?.className).not.toBe(neutralSpan?.className);
    expect(neutralSpan?.className).toContain("variantStyles.neutral");
  });

  it("applies distinct classes per size", () => {
    const { container: small } = render(<Badge size="small">S</Badge>);
    const { container: medium } = render(<Badge size="medium">M</Badge>);
    expect(small.querySelector("span")?.className).not.toBe(
      medium.querySelector("span")?.className,
    );
    expect(small.querySelector("span")?.className).toContain(
      "sizeStyles.small",
    );
  });

  it("renders a decorative icon marked aria-hidden", () => {
    render(<Badge icon={<span data-testid="icon">★</span>}>Rated</Badge>);
    const icon = screen.getByTestId("icon");
    expect(icon).toBeInTheDocument();
    // The icon is wrapped in an aria-hidden span.
    expect(icon.parentElement).toHaveAttribute("aria-hidden");
  });
});

describe("Badge prop forwarding", () => {
  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(<Badge css={overrides.box}>Label</Badge>);
    expect(screen.getByText("Label").className).toContain("overrides.box");
  });

  it("forwards native span attributes", () => {
    render(
      <Badge data-testid="badge" id="badge-id">
        Label
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("id", "badge-id");
  });

  it("forwards click handlers", () => {
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>Label</Badge>);
    fireEvent.click(screen.getByText("Label"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("forwards a ref to the span element", () => {
    const ref: { current: HTMLSpanElement | null } = { current: null };
    render(<Badge ref={ref}>Label</Badge>);
    expect(ref.current?.tagName).toBe("SPAN");
  });
});
