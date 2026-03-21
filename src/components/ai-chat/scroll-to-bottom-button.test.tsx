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
});
