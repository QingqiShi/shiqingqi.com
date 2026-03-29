import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalTargetProvider } from "#src/components/shared/fixed-element-portal-target.tsx";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { ChatActionsContext } from "./chat-actions-context";
import { MediaDetailProvider } from "./media-detail-context";
import { MediaDetailOverlay } from "./media-detail-overlay";
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

    // The dialog contains focusable elements (close button, "Add to chat" button, etc.).
    // Tabbing forward from the last focusable element should wrap to the first.
    const dialog = screen.getByRole("dialog");
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusableElements.length).toBeGreaterThanOrEqual(2);

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    lastFocusable.focus();
    expect(lastFocusable).toHaveFocus();

    // Dispatch Tab keydown on document (where the handler is registered)
    fireEvent.keyDown(document, { key: "Tab" });

    // Focus should wrap to the first focusable element
    expect(firstFocusable).toHaveFocus();
  });

  it("traps focus within the dialog on Shift+Tab", async () => {
    const user = userEvent.setup();
    renderWithOverlay();

    await user.click(screen.getByRole("button", { name: "Inception" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });

    // Close button is the first focusable element in the dialog.
    // Shift+Tab from the first element should wrap to the last.
    const dialog = screen.getByRole("dialog");
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusableElements.length).toBeGreaterThanOrEqual(2);

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    firstFocusable.focus();
    expect(firstFocusable).toHaveFocus();

    // Dispatch Shift+Tab keydown on document (where the handler is registered)
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    // Focus should wrap to the last focusable element
    expect(lastFocusable).toHaveFocus();
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
