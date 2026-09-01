import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalTargetProvider } from "#src/components/shared/portal-target-provider.tsx";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/media-list-item.ts";
import { ChatActionsContext } from "./chat-actions-context";
import { MediaDetailOverlay } from "./media-detail-overlay";
import { MediaDetailProvider } from "./media-detail-provider";
import { ToolMediaCards } from "./tool-media-cards";

const mockItems: ReadonlyArray<MediaListItem> = [
  {
    id: 123,
    title: "Inception",
    posterPath: "/inception.jpg",
    rating: 8.4,
    mediaType: "movie",
  },
  {
    id: 456,
    title: "Breaking Bad",
    posterPath: "/bb.jpg",
    rating: 9.5,
    mediaType: "tv",
  },
];

const mockItemsWithMissingTitle: ReadonlyArray<MediaListItem> = [
  {
    id: 789,
    posterPath: "/unknown.jpg",
    rating: 6.0,
    mediaType: "movie",
  },
];

function renderWithOverlay() {
  return render(
    <PortalTargetProvider>
      <MediaDetailProvider>
        <ChatActionsContext
          value={{
            sendMessage: vi.fn(),
            attachedMedia: null,
            setAttachedMedia: vi.fn(),
          }}
        >
          <ToolMediaCards items={mockItems} />
          <MediaDetailOverlay />
        </ChatActionsContext>
      </MediaDetailProvider>
    </PortalTargetProvider>,
  );
}

describe("MediaDetailOverlay", () => {
  it("opens a modal dialog when a media card is clicked", async () => {
    const user = userEvent.setup();
    renderWithOverlay();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inception" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus to close button when dialog opens", async () => {
    const user = userEvent.setup();
    renderWithOverlay();

    await user.click(screen.getByRole("button", { name: "Inception" }));

    // requestAnimationFrame is used to defer focus, so wait for it
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });
  });

  it("closes dialog and restores focus on Escape", async () => {
    const user = userEvent.setup();
    renderWithOverlay();

    const triggerButton = screen.getByRole("button", { name: "Inception" });
    await user.click(triggerButton);

    await vi.waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(triggerButton).toHaveFocus();
  });

  it("traps focus within the dialog on Tab", async () => {
    const user = userEvent.setup();
    renderWithOverlay();

    await user.click(screen.getByRole("button", { name: "Inception" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });

    // The dialog's tab stops run from the close button to "Add to chat", so
    // Tab from "Add to chat" wraps back to "Close".
    const addToChat = screen.getByRole("button", { name: "Add to chat" });
    addToChat.focus();
    expect(addToChat).toHaveFocus();

    // Dispatch Tab keydown on document (where the handler is registered)
    fireEvent.keyDown(document, { key: "Tab" });

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("traps focus within the dialog on Shift+Tab", async () => {
    const user = userEvent.setup();
    renderWithOverlay();

    await user.click(screen.getByRole("button", { name: "Inception" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });

    // The close button already holds focus as the dialog's first tab stop, so
    // Shift+Tab wraps to the last one, "Add to chat".

    // Dispatch Shift+Tab keydown on document (where the handler is registered)
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(screen.getByRole("button", { name: "Add to chat" })).toHaveFocus();
  });

  it("labels dialog with media title when available", async () => {
    const user = userEvent.setup();
    renderWithOverlay();

    await user.click(screen.getByRole("button", { name: "Inception" }));

    expect(
      screen.getByRole("dialog", { name: "Inception" }),
    ).toBeInTheDocument();
  });

  it("falls back to media type label when title is missing", async () => {
    const user = userEvent.setup();
    render(
      <PortalTargetProvider>
        <MediaDetailProvider>
          <ChatActionsContext
            value={{
              sendMessage: vi.fn(),
              attachedMedia: null,
              setAttachedMedia: vi.fn(),
            }}
          >
            <ToolMediaCards items={mockItemsWithMissingTitle} />
            <MediaDetailOverlay />
          </ChatActionsContext>
        </MediaDetailProvider>
      </PortalTargetProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Movie" }));

    expect(
      screen.getByRole("dialog", { name: "Movie details" }),
    ).toBeInTheDocument();
  });
});
