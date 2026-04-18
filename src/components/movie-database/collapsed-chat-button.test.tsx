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
  it("renders the button as aria-hidden and not tabbable when hero input is visible", () => {
    renderButton({ isHeroInputVisible: true });
    const button = screen.getByRole("button", {
      name: "Ask AI about movies and TV shows",
      hidden: true,
    });
    expect(button).toHaveAttribute("tabindex", "-1");
    expect(button.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("renders a reachable button when hero input is not visible", () => {
    renderButton({ isHeroInputVisible: false });
    const button = screen.getByRole("button", {
      name: "Ask AI about movies and TV shows",
    });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveAttribute("tabindex", "-1");
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
