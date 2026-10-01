import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./progress.tsx";

describe("Progress accessibility", () => {
  it("exposes role progressbar with the label as its accessible name", () => {
    render(<Progress label="Upload progress" value={40} />);
    expect(
      screen.getByRole("progressbar", { name: "Upload progress" }),
    ).toBeInTheDocument();
  });

  it("reports the value against the default max of 100", () => {
    render(<Progress label="Upload" value={40} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("reports the value against a custom max", () => {
    render(<Progress label="Quiz" value={3} max={5} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
  });

  it("keeps the label while forwarding other aria attributes", () => {
    render(<Progress label="Upload" value={40} aria-describedby="hint" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-describedby", "hint");
  });

  it("does not let a caller replace the accessible name or the value", () => {
    // TypeScript permits any hyphenated JSX attribute whatever the props type,
    // so the guarantee is that the component writes these after the spread.
    render(
      <Progress
        label="Upload"
        value={40}
        aria-label="Wrong"
        aria-valuenow={99}
      />,
    );
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });
});

describe("Progress clamping", () => {
  it("clamps a value below the minimum", () => {
    render(<Progress label="Upload" value={-20} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("clamps a value above the max", () => {
    render(<Progress label="Quiz" value={9} max={5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "5",
    );
  });

  it("falls back to zero for a non-finite value", () => {
    render(<Progress label="Upload" value={Number.NaN} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar.getAttribute("style")).toContain("0%");
  });

  it("falls back to a max of 100 when max is not positive", () => {
    render(<Progress label="Upload" value={40} max={0} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });
});

describe("Progress indicator", () => {
  it("sizes the indicator from the value/max percentage", () => {
    render(<Progress label="Quiz" value={3} max={5} />);
    expect(screen.getByRole("progressbar").getAttribute("style")).toContain(
      "60%",
    );
  });

  it("reflects an updated value", () => {
    const { rerender } = render(<Progress label="Upload" value={20} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "20",
    );

    rerender(<Progress label="Upload" value={75} />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "75");
    expect(bar.getAttribute("style")).toContain("75%");
  });
});

describe("Progress sizing", () => {
  it("applies distinct size classes", () => {
    const { rerender } = render(
      <Progress label="Upload" value={40} size="sm" />,
    );
    const smClass = screen.getByRole("progressbar").className;
    expect(smClass).toContain("sizeStyles.sm");

    rerender(<Progress label="Upload" value={40} size="lg" />);
    const lgClass = screen.getByRole("progressbar").className;
    expect(lgClass).toContain("sizeStyles.lg");
    expect(lgClass).not.toBe(smClass);
  });

  it("defaults to the md size", () => {
    render(<Progress label="Upload" value={40} />);
    expect(screen.getByRole("progressbar").className).toContain(
      "sizeStyles.md",
    );
  });
});

describe("Progress prop forwarding", () => {
  it("composes a caller css override", () => {
    const overrides = stylex.create({ mark: { marginBlock: "4px" } });
    render(<Progress label="Upload" value={40} css={overrides.mark} />);
    expect(screen.getByRole("progressbar").className).toContain(
      "overrides.mark",
    );
  });

  it("forwards native attributes", () => {
    render(<Progress label="Upload" value={40} id="upload-bar" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("id", "upload-bar");
  });

  it("forwards a ref to the div element", () => {
    const ref: { current: HTMLDivElement | null } = { current: null };
    render(<Progress label="Upload" value={40} ref={ref} />);
    expect(ref.current?.tagName).toBe("DIV");
  });
});
