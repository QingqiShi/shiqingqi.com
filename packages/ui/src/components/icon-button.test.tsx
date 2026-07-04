import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./icon-button.tsx";

const Glyph = () => <svg data-testid="glyph" viewBox="0 0 16 16" />;

describe("IconButton rendering", () => {
  it("renders a button with StyleX classes", () => {
    render(<IconButton icon={<Glyph />} aria-label="Add" />);
    const button = screen.getByRole("button", { name: "Add" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toContain("styles.base");
  });

  it("defaults the native type to 'button'", () => {
    render(<IconButton icon={<Glyph />} aria-label="Add" />);
    expect(screen.getByRole("button", { name: "Add" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("allows overriding the native type", () => {
    render(<IconButton icon={<Glyph />} aria-label="Submit" type="submit" />);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});

describe("IconButton accessibility", () => {
  it("applies the accessible name from aria-label", () => {
    render(<IconButton icon={<Glyph />} aria-label="Scroll to bottom" />);
    expect(
      screen.getByRole("button", { name: "Scroll to bottom" }),
    ).toBeInTheDocument();
  });

  it("names the button via aria-labelledby", () => {
    render(
      <>
        <span id="label-id">Scroll left</span>
        <IconButton icon={<Glyph />} aria-labelledby="label-id" />
      </>,
    );
    expect(
      screen.getByRole("button", { name: "Scroll left" }),
    ).toBeInTheDocument();
  });

  it("wraps the icon in an aria-hidden element so it is not announced", () => {
    render(<IconButton icon={<Glyph />} aria-label="Add" />);
    const glyph = screen.getByTestId("glyph");
    expect(glyph.parentElement).toHaveAttribute("aria-hidden");
  });
});

describe("IconButton interaction", () => {
  it("fires onClick when clicked", () => {
    const handleClick = vi.fn();
    render(
      <IconButton icon={<Glyph />} aria-label="Add" onClick={handleClick} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const handleClick = vi.fn();
    render(
      <IconButton
        icon={<Glyph />}
        aria-label="Add"
        disabled
        onClick={handleClick}
      />,
    );
    const button = screen.getByRole("button", { name: "Add" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe("IconButton variants", () => {
  it("applies distinct classes per size", () => {
    const { container: sm } = render(
      <IconButton icon={<Glyph />} aria-label="A" size="sm" />,
    );
    const { container: lg } = render(
      <IconButton icon={<Glyph />} aria-label="B" size="lg" />,
    );
    const smButton = sm.querySelector("button");
    const lgButton = lg.querySelector("button");
    expect(smButton?.className).not.toBe(lgButton?.className);
    expect(smButton?.className).toContain("sizeStyles.sm");
    expect(lgButton?.className).toContain("sizeStyles.lg");
  });

  it("applies distinct classes per variant", () => {
    const { container: plain } = render(
      <IconButton icon={<Glyph />} aria-label="A" variant="plain" />,
    );
    const { container: surface } = render(
      <IconButton icon={<Glyph />} aria-label="B" variant="surface" />,
    );
    expect(plain.querySelector("button")?.className).not.toBe(
      surface.querySelector("button")?.className,
    );
    expect(surface.querySelector("button")?.className).toContain(
      "variantStyles.surface",
    );
  });

  it("applies distinct classes per shape", () => {
    const { container: circle } = render(
      <IconButton icon={<Glyph />} aria-label="A" shape="circle" />,
    );
    const { container: square } = render(
      <IconButton icon={<Glyph />} aria-label="B" shape="square" />,
    );
    expect(circle.querySelector("button")?.className).not.toBe(
      square.querySelector("button")?.className,
    );
    expect(square.querySelector("button")?.className).toContain(
      "shapeStyles.square",
    );
  });
});

describe("IconButton prop forwarding", () => {
  it("merges a caller className with the StyleX classes", () => {
    render(<IconButton icon={<Glyph />} aria-label="Add" className="mine" />);
    const button = screen.getByRole("button", { name: "Add" });
    expect(button.className).toContain("mine");
    expect(button.className).toContain("styles.base");
  });

  it("forwards inline style", () => {
    render(
      <IconButton icon={<Glyph />} aria-label="Add" style={{ opacity: 0.5 }} />,
    );
    expect(screen.getByRole("button", { name: "Add" })).toHaveStyle({
      opacity: "0.5",
    });
  });

  it("forwards native button attributes", () => {
    render(
      <IconButton icon={<Glyph />} aria-label="Add" data-testid="chip" inert />,
    );
    const button = screen.getByTestId("chip");
    expect(button).toHaveAttribute("inert");
  });

  it("forwards a ref to the button element", () => {
    const ref: { current: HTMLButtonElement | null } = { current: null };
    render(<IconButton icon={<Glyph />} aria-label="Add" ref={ref} />);
    expect(ref.current?.tagName).toBe("BUTTON");
  });
});
