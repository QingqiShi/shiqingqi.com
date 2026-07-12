import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { ScrollFade } from "./scroll-fade.tsx";

describe("ScrollFade", () => {
  it("renders its children inside the scroll container", () => {
    render(
      <ScrollFade>
        <span>content</span>
      </ScrollFade>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  // The mask gradient itself lives in an inline style that jsdom's CSS engine
  // drops, so orientation is asserted through the applied StyleX class instead.
  it("applies the vertical scroll styles by default", () => {
    render(
      <ScrollFade>
        <span>rows</span>
      </ScrollFade>,
    );
    const container = screen.getByText("rows").parentElement;
    expect(container?.className).toContain("styles.vertical");
    expect(container?.className).not.toContain("styles.horizontal");
  });

  it("applies the horizontal scroll styles when horizontal", () => {
    render(
      <ScrollFade orientation="horizontal">
        <span>cards</span>
      </ScrollFade>,
    );
    const container = screen.getByText("cards").parentElement;
    expect(container?.className).toContain("styles.horizontal");
    expect(container?.className).not.toContain("styles.vertical");
  });

  it("forwards a ref to the scroll container", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ScrollFade ref={ref}>
        <span>measured</span>
      </ScrollFade>,
    );
    expect(ref.current).toBe(screen.getByText("measured").parentElement);
  });

  it("passes native div attributes through to the scroll container", () => {
    render(
      <ScrollFade role="region" aria-label="cards" tabIndex={0}>
        <span>named</span>
      </ScrollFade>,
    );
    const container = screen.getByRole("region", { name: "cards" });
    expect(container).toHaveAttribute("tabindex", "0");
    expect(container).toContainElement(screen.getByText("named"));
  });
});
