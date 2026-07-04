import * as stylex from "@stylexjs/stylex";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton.tsx";

describe("Skeleton rendering", () => {
  it("renders a div with the base skeleton class", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector("div");
    expect(el?.className).toContain("styles.skeleton");
  });

  it("applies the fill class when fill is set", () => {
    const { container } = render(<Skeleton fill />);
    expect(container.querySelector("div")?.className).toContain("styles.fill");
  });
});

describe("Skeleton sizing", () => {
  it("treats a numeric width as pixels", () => {
    const { container } = render(<Skeleton width={100} />);
    expect(container.querySelector("div")?.getAttribute("style")).toContain(
      "100px",
    );
  });

  it("passes a string width through verbatim", () => {
    const { container } = render(<Skeleton width="100%" />);
    expect(container.querySelector("div")?.getAttribute("style")).toContain(
      "100%",
    );
  });

  it("treats a numeric height as pixels", () => {
    const { container } = render(<Skeleton height={40} />);
    expect(container.querySelector("div")?.getAttribute("style")).toContain(
      "40px",
    );
  });
});

describe("Skeleton prop forwarding", () => {
  it("composes a caller css override", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    const { container } = render(<Skeleton css={overrides.box} />);
    expect(container.querySelector("div")?.className).toContain(
      "overrides.box",
    );
  });

  it("merges a caller className with the StyleX classes", () => {
    const { container } = render(<Skeleton className="my-skeleton" />);
    const el = container.querySelector("div");
    expect(el?.className).toContain("my-skeleton");
    expect(el?.className).toContain("styles.skeleton");
  });

  it("forwards inline style", () => {
    const { container } = render(<Skeleton style={{ margin: "4px" }} />);
    expect(container.querySelector("div")?.getAttribute("style")).toContain(
      "margin",
    );
  });

  it("forwards a ref to the div element", () => {
    const ref: { current: HTMLDivElement | null } = { current: null };
    render(<Skeleton ref={ref} />);
    expect(ref.current?.tagName).toBe("DIV");
  });
});
