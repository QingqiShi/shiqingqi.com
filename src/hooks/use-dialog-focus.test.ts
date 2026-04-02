import { fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDialogFocus } from "./use-dialog-focus";

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

    renderHook(() => useDialogFocus({ isOpen: true, dialogRef, onClose }));

    expect(button1).toHaveFocus();
  });

  it("moves focus to initialFocusRef when provided", () => {
    const { dialog, button2 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const initialFocusRef = { current: button2 };
    const onClose = vi.fn();

    renderHook(() =>
      useDialogFocus({
        isOpen: true,
        dialogRef,
        onClose,
        initialFocusRef,
      }),
    );

    expect(button2).toHaveFocus();
  });

  it("does not move focus when closed", () => {
    const { dialog, button1 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => useDialogFocus({ isOpen: false, dialogRef, onClose }));

    expect(button1).not.toHaveFocus();
  });

  it("calls onClose when Escape is pressed", () => {
    const { dialog } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => useDialogFocus({ isOpen: true, dialogRef, onClose }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose on Escape when closed", () => {
    const { dialog } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => useDialogFocus({ isOpen: false, dialogRef, onClose }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("wraps focus from last to first element on Tab", () => {
    const { dialog, button1, button3 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => useDialogFocus({ isOpen: true, dialogRef, onClose }));

    button3.focus();
    expect(button3).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });

    expect(button1).toHaveFocus();
  });

  it("wraps focus from first to last element on Shift+Tab", () => {
    const { dialog, button1, button3 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => useDialogFocus({ isOpen: true, dialogRef, onClose }));

    button1.focus();
    expect(button1).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(button3).toHaveFocus();
  });

  it("does not trap focus for Tab on middle elements", () => {
    const { dialog, button2 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => useDialogFocus({ isOpen: true, dialogRef, onClose }));

    button2.focus();
    expect(button2).toHaveFocus();

    // Tab on a middle element should not be prevented
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    const prevented = !document.dispatchEvent(event);
    expect(prevented).toBe(false);
  });

  it("saves and restores trigger focus on cleanup", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Trigger";
    document.body.append(trigger);
    trigger.focus();
    expect(trigger).toHaveFocus();

    const { dialog } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    const { unmount } = renderHook(() =>
      useDialogFocus({ isOpen: true, dialogRef, onClose }),
    );

    // Focus moved into dialog
    expect(trigger).not.toHaveFocus();

    unmount();

    // Focus restored to trigger
    expect(trigger).toHaveFocus();
  });
});
