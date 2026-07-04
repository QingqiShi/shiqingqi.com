import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./spinner.tsx";

describe("Spinner accessibility", () => {
  it("exposes role status with the label as its accessible name", () => {
    render(<Spinner label="Loading results" />);
    expect(
      screen.getByRole("status", { name: "Loading results" }),
    ).toBeInTheDocument();
  });

  it("marks the live region polite", () => {
    render(<Spinner label="Loading" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("is decorative (no role, aria-hidden) when aria-hidden is set", () => {
    const { container } = render(<Spinner aria-hidden />);
    expect(screen.queryByRole("status")).toBeNull();
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("marks the SVG decorative in both modes", () => {
    const { container } = render(<Spinner label="Loading" />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("Spinner sizing", () => {
  it("applies distinct size classes", () => {
    const { rerender } = render(<Spinner label="Loading" size="sm" />);
    const smClass = screen.getByRole("status").className;
    expect(smClass).toContain("sizeStyles.sm");

    rerender(<Spinner label="Loading" size="lg" />);
    const lgClass = screen.getByRole("status").className;
    expect(lgClass).toContain("sizeStyles.lg");
    expect(lgClass).not.toBe(smClass);
  });

  it("defaults to the md size", () => {
    render(<Spinner label="Loading" />);
    expect(screen.getByRole("status").className).toContain("sizeStyles.md");
  });
});

describe("Spinner tone", () => {
  it("applies distinct tone classes", () => {
    const { rerender } = render(<Spinner label="Loading" tone="current" />);
    const current = screen.getByRole("status").className;
    expect(current).toContain("toneStyles.current");

    rerender(<Spinner label="Loading" tone="accent" />);
    expect(screen.getByRole("status").className).toContain("toneStyles.accent");
  });
});

describe("Spinner prop forwarding", () => {
  it("composes a caller css override", () => {
    const overrides = stylex.create({ mark: { margin: "4px" } });
    render(<Spinner label="Loading" css={overrides.mark} />);
    expect(screen.getByRole("status").className).toContain("overrides.mark");
  });

  it("merges a caller className and forwards native attributes", () => {
    render(<Spinner label="Loading" className="my-spinner" id="s1" />);
    const el = screen.getByRole("status");
    expect(el.className).toContain("my-spinner");
    expect(el).toHaveAttribute("id", "s1");
  });

  it("forwards a ref to the span element", () => {
    const ref: { current: HTMLSpanElement | null } = { current: null };
    render(<Spinner label="Loading" ref={ref} />);
    expect(ref.current?.tagName).toBe("SPAN");
  });
});
