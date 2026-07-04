import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Overlay } from "./overlay.tsx";

function OverlayHarness({
  isOpen,
  onClose,
  useInitialFocus = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  useInitialFocus?: boolean;
}) {
  const playRef = useRef<HTMLButtonElement>(null);
  return (
    <Overlay
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Close video"
      aria-label="Video player"
      initialFocusRef={useInitialFocus ? playRef : undefined}
    >
      <button type="button" ref={playRef}>
        Play
      </button>
    </Overlay>
  );
}

describe("Overlay", () => {
  it("renders a modal dialog named by its aria-label", () => {
    render(<OverlayHarness isOpen onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Video player" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("labels the close button with the provided closeLabel", () => {
    render(<OverlayHarness isOpen onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Video player" });
    expect(
      within(dialog).getByRole("button", { name: "Close video" }),
    ).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<OverlayHarness isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus to the close button when it opens", async () => {
    render(<OverlayHarness isOpen onClose={vi.fn()} />);

    // Focus lands on the next animation frame (after the deferred open settles),
    // so wait for it rather than asserting synchronously. The close button is
    // the first focusable element inside the dialog, so it receives focus when
    // no initialFocusRef is supplied.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close video" })).toHaveFocus();
    });
  });

  it("moves focus to initialFocusRef when provided", async () => {
    render(<OverlayHarness isOpen onClose={vi.fn()} useInitialFocus />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play" })).toHaveFocus();
    });
  });

  it("renders nothing while closed", () => {
    render(<OverlayHarness isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Close video" })).toBeNull();
  });
});
