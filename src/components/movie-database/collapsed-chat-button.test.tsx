import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { CollapsedChatButton } from "./collapsed-chat-button";
import { HeroVisibilityContext } from "./hero-visibility-context";

function renderButton({ isHeroInputVisible }: { isHeroInputVisible: boolean }) {
  return render(
    <HeroVisibilityContext
      value={{
        isHeroInputVisible,
        heroInputRef: { current: null },
      }}
    >
      <CollapsedChatButton
        aiModeHref="/en/movie-database/ai-mode"
        label="AI"
        ariaLabel="Ask AI about movies and TV shows"
      />
    </HeroVisibilityContext>,
  );
}

describe("CollapsedChatButton", () => {
  it("renders the link as aria-hidden and inert when hero input is visible", () => {
    renderButton({ isHeroInputVisible: true });
    const link = screen.getByRole("link", {
      name: "Ask AI about movies and TV shows",
      hidden: true,
    });
    expect(link).toHaveAttribute("tabindex", "-1");
    expect(link.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("renders a reachable link when hero input is not visible", () => {
    renderButton({ isHeroInputVisible: false });
    const link = screen.getByRole("link", {
      name: "Ask AI about movies and TV shows",
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/en/movie-database/ai-mode");
    expect(link).not.toHaveAttribute("tabindex", "-1");
  });

  it("shows the label text", () => {
    renderButton({ isHeroInputVisible: false });
    expect(screen.getByText("AI")).toBeInTheDocument();
  });
});
