import { userEvent } from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { CollapsedChatButton } from "./collapsed-chat-button";
import { HeroVisibilityContext } from "./hero-visibility-context";
import { InlineChatContext } from "./inline-chat-context";

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

function renderButton({
  isHeroInputVisible,
  openChat = vi.fn(),
}: {
  isHeroInputVisible: boolean;
  openChat?: () => void;
}) {
  return render(
    <InlineChatContext
      value={{
        isChatActive: false,
        openChat,
        openChatWithSession: vi.fn(),
        closeChat: vi.fn(),
      }}
    >
      <HeroVisibilityContext
        value={{
          isHeroInputVisible,
          heroInputRef: () => {},
        }}
      >
        <CollapsedChatButton
          label="AI"
          ariaLabel="Ask AI about movies and TV shows"
        />
      </HeroVisibilityContext>
    </InlineChatContext>,
  );
}

describe("CollapsedChatButton", () => {
  it("is inert (hidden from AT, removed from tab order, non-clickable) when hero input is visible", () => {
    renderButton({ isHeroInputVisible: true });
    // `hidden: true` is the RTL escape hatch for elements that are inert —
    // they're still in the DOM, just excluded from the accessibility tree.
    const button = screen.getByRole("button", {
      name: "Ask AI about movies and TV shows",
      hidden: true,
    });
    // The native `inert` attribute on the wrapper is the single declarative
    // switch that covers all three concerns — no need to stack aria-hidden
    // and tabIndex=-1 on top, and the aria-hidden + focusable combo is a
    // WCAG 4.1.2 anti-pattern (see PR #2165).
    const wrapper = button.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute("inert");
    expect(wrapper).not.toHaveAttribute("aria-hidden");
    expect(button).not.toHaveAttribute("aria-hidden");
    expect(button).not.toHaveAttribute("tabindex");
  });

  it("renders a reachable button when hero input is not visible", () => {
    renderButton({ isHeroInputVisible: false });
    const button = screen.getByRole("button", {
      name: "Ask AI about movies and TV shows",
    });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveAttribute("tabindex");
    expect(button).not.toHaveAttribute("aria-hidden");
    expect(button.parentElement).not.toHaveAttribute("inert");
  });

  it("shows the label text", () => {
    renderButton({ isHeroInputVisible: false });
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("opens chat when clicked", async () => {
    const user = userEvent.setup();
    const openChat = vi.fn();
    renderButton({ isHeroInputVisible: false, openChat });
    await user.click(
      screen.getByRole("button", { name: "Ask AI about movies and TV shows" }),
    );
    expect(openChat).toHaveBeenCalledTimes(1);
  });
});
