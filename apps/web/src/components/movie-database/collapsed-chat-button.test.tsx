import { render as renderWithoutProviders } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { CollapsedChatButton } from "./collapsed-chat-button";
import { HeroVisibilityContext } from "./hero-visibility-context";
import { InlineChatContext } from "./inline-chat-context";

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buttonUnderContexts({
  isHeroInputVisible,
  openChat = vi.fn(),
}: {
  isHeroInputVisible: boolean;
  openChat?: () => void;
}) {
  return (
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
        <CollapsedChatButton ariaLabel="Ask AI about movies and TV shows" />
      </HeroVisibilityContext>
    </InlineChatContext>
  );
}

function renderButton(props: Parameters<typeof buttonUnderContexts>[0]) {
  return render(buttonUnderContexts(props));
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

  it("opens chat when clicked", async () => {
    const user = userEvent.setup();
    const openChat = vi.fn();
    renderButton({ isHeroInputVisible: false, openChat });
    await user.click(
      screen.getByRole("button", { name: "Ask AI about movies and TV shows" }),
    );
    expect(openChat).toHaveBeenCalledTimes(1);
  });

  // The hero visibility provider sits in the shell, so it can see the hero
  // leave the viewport before the sticky bar's streamed boundary hydrates.
  // React leaves a mismatched attribute as the server rendered it, so the
  // button would stay inert until the hero came into view and left again.
  it("hydrates as the server rendered it, then follows the hero", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      buttonUnderContexts({ isHeroInputVisible: true }),
    );
    document.body.appendChild(container);
    const reportError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithoutProviders(buttonUnderContexts({ isHeroInputVisible: false }), {
      container,
      hydrate: true,
    });

    expect(reportError).not.toHaveBeenCalled();
    const button = screen.getByRole("button", {
      name: "Ask AI about movies and TV shows",
    });
    expect(button.parentElement).not.toHaveAttribute("inert");
  });
});
