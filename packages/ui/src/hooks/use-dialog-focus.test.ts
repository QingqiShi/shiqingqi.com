import { fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDialogFocus } from "./use-dialog-focus.ts";

function createFocusableDialog() {
  const dialog = document.createElement("div");
  const button1 = document.createElement("button");
  button1.textContent = "First";
  const button2 = document.createElement("button");
  button2.textContent = "Second";
  const button3 = document.createElement("button");
  button3.textContent = "Third";
  dialog.append(button1, button2, button3);
  document.body.append(dialog);
  return { dialog, button1, button2, button3 };
}

describe("useDialogFocus", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    // Stub requestAnimationFrame to execute callbacks synchronously
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("moves focus to the first focusable element when opened", () => {
    const { dialog, button1 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    expect(button1).toHaveFocus();
  });

  it("moves focus to initialFocusRef when provided", () => {
    const { dialog, button2 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const initialFocusRef = { current: button2 };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({
        isOpen: true,
        dialogRef,
        onClose,
        initialFocusRef,
      });
    });

    expect(button2).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", () => {
    const { dialog } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("wraps focus from last to first element on Tab", () => {
    const { dialog, button1, button3 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    button3.focus();
    expect(button3).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });

    expect(button1).toHaveFocus();
  });

  it("wraps focus from first to last element on Shift+Tab", () => {
    const { dialog, button1, button3 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    button1.focus();
    expect(button1).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(button3).toHaveFocus();
  });

  it("does not steal focus or overwrite triggerRef when the caller re-renders with a new onClose identity", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Trigger";
    document.body.append(trigger);
    trigger.focus();

    const { dialog, button1, button2 } = createFocusableDialog();
    const dialogRef = { current: dialog };

    const { rerender, unmount } = renderHook(
      ({ onClose }: { onClose: () => void }) => {
        useDialogFocus({ isOpen: true, dialogRef, onClose });
      },
      { initialProps: { onClose: vi.fn() } },
    );

    // Hook moved focus to first focusable on mount.
    expect(button1).toHaveFocus();

    // Simulate the user tabbing within the dialog.
    button2.focus();
    expect(button2).toHaveFocus();

    // Parent re-renders and passes a brand-new inline onClose — this is
    // what happens on every AI-chat streaming chunk. The dialog stays open.
    rerender({ onClose: vi.fn() });

    // Focus must stay where the user put it, not snap back to button1.
    expect(button2).toHaveFocus();

    // And on unmount, the trigger saved on the original open should still
    // be restored — proving triggerRef wasn't overwritten with a dialog-
    // internal element during the re-render.
    unmount();
    expect(trigger).toHaveFocus();
  });

  it("invokes the latest onClose after the caller re-renders with a new identity", () => {
    const { dialog } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const firstOnClose = vi.fn();
    const secondOnClose = vi.fn();

    const { rerender } = renderHook(
      ({ onClose }: { onClose: () => void }) => {
        useDialogFocus({ isOpen: true, dialogRef, onClose });
      },
      { initialProps: { onClose: firstOnClose } },
    );

    rerender({ onClose: secondOnClose });

    fireEvent.keyDown(document, { key: "Escape" });

    // The Escape handler reads the latest onClose, not the one captured
    // when the effect first ran.
    expect(firstOnClose).not.toHaveBeenCalled();
    expect(secondOnClose).toHaveBeenCalledOnce();
  });

  it("gives focus back to the element that opened it on close, with no scroll", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.append(trigger);
    trigger.focus();
    const { dialog, button1 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const focus = vi.spyOn(trigger, "focus");

    const { rerender } = renderHook(
      ({ isOpen }) => {
        useDialogFocus({ isOpen, dialogRef, onClose: vi.fn() });
      },
      { initialProps: { isOpen: true } },
    );
    expect(button1).toHaveFocus();

    rerender({ isOpen: false });

    expect(trigger).toHaveFocus();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
