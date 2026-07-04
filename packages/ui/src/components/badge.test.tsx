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
    render(<Badge icon={<span data-testid="glyph">★</span>}>Rated</Badge>);
    const glyph = screen.getByTestId("glyph");
    expect(glyph).toBeInTheDocument();
    // The icon is wrapped in an aria-hidden span.
    expect(glyph.parentElement).toHaveAttribute("aria-hidden");
  });
});

describe("Badge prop forwarding", () => {
  it("merges a caller className with the StyleX classes", () => {
    render(<Badge className="my-badge">Tag</Badge>);
    const badge = screen.getByText("Tag");
    expect(badge.className).toContain("my-badge");
    expect(badge.className).toContain("styles.base");
  });

  it("forwards inline style", () => {
    render(<Badge style={{ opacity: 0.5 }}>Tag</Badge>);
    expect(screen.getByText("Tag")).toHaveStyle({ opacity: "0.5" });
  });

  it("forwards native span attributes", () => {
    render(
      <Badge data-testid="chip" id="chip-id">
        Tag
      </Badge>,
    );
    const chip = screen.getByTestId("chip");
    expect(chip).toHaveAttribute("id", "chip-id");
  });

  it("forwards click handlers", () => {
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>Tag</Badge>);
    fireEvent.click(screen.getByText("Tag"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("forwards a ref to the span element", () => {
    const ref: { current: HTMLSpanElement | null } = { current: null };
    render(<Badge ref={ref}>Tag</Badge>);
    expect(ref.current?.tagName).toBe("SPAN");
  });
});
