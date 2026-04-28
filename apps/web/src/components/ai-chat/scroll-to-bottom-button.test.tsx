import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";

describe("ScrollToBottomButton", () => {
  it("renders button with correct aria-label", () => {
    render(
      <ScrollToBottomButton
        visible={true}
        label="Scroll to bottom"
        onClick={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Scroll to bottom" }),
    ).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <ScrollToBottomButton
        visible={true}
        label="Scroll to bottom"
        onClick={handleClick}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Scroll to bottom" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is inert (hidden from AT, removed from tab order, non-clickable) when not visible", () => {
    const { container } = render(
      <ScrollToBottomButton
        visible={false}
        label="Scroll to bottom"
        onClick={() => {}}
      />,
    );

    const button = container.querySelector("button");
    // The native `inert` attribute is the single declarative switch that
    // covers all three concerns: removes the button from the a11y tree,
    // skips it in the tab order, and blocks pointer events.
    expect(button).toHaveAttribute("inert");
    // And we no longer stack aria-hidden/tabIndex on top of inert — those
    // would be redundant, and the aria-hidden + focusable combo is a WCAG
    // 4.1.2 anti-pattern.
    expect(button).not.toHaveAttribute("aria-hidden");
    expect(button).not.toHaveAttribute("tabindex");
  });

  it("is a regular interactive control when visible", () => {
    const { container } = render(
      <ScrollToBottomButton
        visible={true}
        label="Scroll to bottom"
        onClick={() => {}}
      />,
    );

    const button = container.querySelector("button");
    expect(button).not.toHaveAttribute("inert");
    expect(button).not.toHaveAttribute("aria-hidden");
    expect(button).not.toHaveAttribute("tabindex");
    // Reachable via role query.
    expect(
      screen.getByRole("button", { name: "Scroll to bottom" }),
    ).toBeInTheDocument();
  });
});
