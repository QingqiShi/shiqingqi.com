import { render as renderWithoutProviders } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { HeroVisibilityContext } from "#src/movie-database/browse/hero-visibility-context.ts";
import { screen } from "#src/testing/test-utils.tsx";
import { CollapsedChatButton } from "./collapsed-chat-button";
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
          heroSlotRef: () => {},
        }}
      >
        <CollapsedChatButton ariaLabel="Ask AI about movies and TV shows" />
      </HeroVisibilityContext>
    </InlineChatContext>
  );
}

describe("CollapsedChatButton", () => {
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
