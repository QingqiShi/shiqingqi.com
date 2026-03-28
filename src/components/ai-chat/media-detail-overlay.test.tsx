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
});
