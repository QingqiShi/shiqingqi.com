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

  it("is hidden from accessibility tree when not visible", () => {
    render(
      <ScrollToBottomButton
        visible={false}
        label="Scroll to bottom"
        onClick={() => {}}
      />,
    );

    // aria-hidden removes it from the accessible role query
    expect(
      screen.queryByRole("button", { name: "Scroll to bottom" }),
    ).not.toBeInTheDocument();
  });

  it("is removed from tab order when not visible", () => {
    const { container } = render(
      <ScrollToBottomButton
        visible={false}
        label="Scroll to bottom"
        onClick={() => {}}
      />,
    );

    const button = container.querySelector("button");
    expect(button).toHaveAttribute("tabindex", "-1");
  });

  it("is in the tab order when visible", () => {
    const { container } = render(
      <ScrollToBottomButton
        visible={true}
        label="Scroll to bottom"
        onClick={() => {}}
      />,
    );

    const button = container.querySelector("button");
    expect(button).toHaveAttribute("tabindex", "0");
    expect(button).toHaveAttribute("aria-hidden", "false");
  });
});
