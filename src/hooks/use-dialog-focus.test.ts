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

  it("does not move focus when closed", () => {
    const { dialog, button1 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: false, dialogRef, onClose });
    });

    expect(button1).not.toHaveFocus();
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

  it("does not call onClose on Escape when closed", () => {
    const { dialog } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: false, dialogRef, onClose });
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
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

  it("does not trap focus for Tab on middle elements", () => {
    const { dialog, button2 } = createFocusableDialog();
    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

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

  it("skips buttons with tabindex=-1 when finding initial focus", () => {
    const dialog = document.createElement("div");
    const hiddenButton = document.createElement("button");
    hiddenButton.textContent = "Hidden";
    hiddenButton.tabIndex = -1;
    const visibleButton = document.createElement("button");
    visibleButton.textContent = "Visible";
    dialog.append(hiddenButton, visibleButton);
    document.body.append(dialog);

    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    expect(visibleButton).toHaveFocus();
    expect(hiddenButton).not.toHaveFocus();
  });

  it("skips tabindex=-1 elements when wrapping focus on Tab", () => {
    const dialog = document.createElement("div");
    const first = document.createElement("button");
    first.textContent = "First";
    const middleHidden = document.createElement("button");
    middleHidden.textContent = "Hidden";
    middleHidden.tabIndex = -1;
    const last = document.createElement("button");
    last.textContent = "Last";
    dialog.append(first, middleHidden, last);
    document.body.append(dialog);

    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    // Wraps to first (not to the tabindex=-1 element)
    expect(first).toHaveFocus();
  });

  it("skips tabindex=-1 elements when wrapping focus on Shift+Tab", () => {
    const dialog = document.createElement("div");
    const first = document.createElement("button");
    first.textContent = "First";
    const lastHidden = document.createElement("button");
    lastHidden.textContent = "Hidden";
    lastHidden.tabIndex = -1;
    const last = document.createElement("button");
    last.textContent = "Last";
    dialog.append(first, lastHidden, last);
    document.body.append(dialog);

    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    // Wraps to the last real focusable, not the tabindex=-1 element
    expect(last).toHaveFocus();
  });

  it("includes elements with tabindex=0 on non-standard tags", () => {
    const dialog = document.createElement("div");
    const customFocusable = document.createElement("div");
    customFocusable.setAttribute("role", "application");
    customFocusable.tabIndex = 0;
    const button = document.createElement("button");
    button.textContent = "Button";
    dialog.append(customFocusable, button);
    document.body.append(dialog);

    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    expect(customFocusable).toHaveFocus();
  });

  it("skips elements inside an inert subtree", () => {
    const dialog = document.createElement("div");
    const inertSection = document.createElement("div");
    inertSection.setAttribute("inert", "");
    const inertButton = document.createElement("button");
    inertButton.textContent = "Inert";
    inertSection.append(inertButton);
    const activeButton = document.createElement("button");
    activeButton.textContent = "Active";
    dialog.append(inertSection, activeButton);
    document.body.append(dialog);

    const dialogRef = { current: dialog };
    const onClose = vi.fn();

    renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    expect(activeButton).toHaveFocus();
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

    const { unmount } = renderHook(() => {
      useDialogFocus({ isOpen: true, dialogRef, onClose });
    });

    // Focus moved into dialog
    expect(trigger).not.toHaveFocus();

    unmount();

    // Focus restored to trigger
    expect(trigger).toHaveFocus();
  });
});
