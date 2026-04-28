import { fireEvent } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PortalTargetProvider } from "#src/components/shared/fixed-element-portal-target.tsx";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { DetailOverlay } from "./detail-overlay";

function TestHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <PortalTargetProvider>
      <button
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Open
      </button>
      <DetailOverlay
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        aria-label="Test dialog"
      >
        <p>Dialog content</p>
        <button>Action</button>
      </DetailOverlay>
    </PortalTargetProvider>
  );
}

describe("DetailOverlay", () => {
  it("does not render when closed", () => {
    render(
      <PortalTargetProvider>
        <DetailOverlay
          isOpen={false}
          onClose={vi.fn()}
          aria-label="Hidden dialog"
        >
          <p>Content</p>
        </DetailOverlay>
      </PortalTargetProvider>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a modal dialog when open", () => {
    render(
      <PortalTargetProvider>
        <DetailOverlay
          isOpen={true}
          onClose={vi.fn()}
          aria-label="Visible dialog"
        >
          <p>Content</p>
        </DetailOverlay>
      </PortalTargetProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "Visible dialog" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PortalTargetProvider>
        <DetailOverlay
          isOpen={true}
          onClose={onClose}
          aria-label="Closable dialog"
        >
          <p>Content</p>
        </DetailOverlay>
      </PortalTargetProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PortalTargetProvider>
        <DetailOverlay
          isOpen={true}
          onClose={onClose}
          aria-label="Backdrop test"
        >
          <p>Content</p>
        </DetailOverlay>
      </PortalTargetProvider>,
    );

    // The backdrop is the element with aria-hidden="true"
    const backdrop =
      screen.getByRole("dialog").parentElement?.previousElementSibling;
    expect(backdrop).toBeTruthy();
    if (backdrop instanceof HTMLElement) {
      await user.click(backdrop);
    }
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("focuses close button when opened", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });
  });

  it("traps focus within the dialog", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });

    const dialog = screen.getByRole("dialog");
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusableElements.length).toBeGreaterThanOrEqual(2);

    const lastFocusable = focusableElements[focusableElements.length - 1];
    lastFocusable.focus();

    fireEvent.keyDown(document, { key: "Tab" });

    expect(focusableElements[0]).toHaveFocus();
  });
});
