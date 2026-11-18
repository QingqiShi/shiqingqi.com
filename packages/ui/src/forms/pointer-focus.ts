import type { FocusEvent, PointerEvent } from "react";

const ATTRIBUTE = "data-pointer-focus";

// A control that a pointer pressed can move focus to a field from code, such
// as a suggestion that fills a prompt. That focus also comes from the pointer,
// so the last input decides it.
let lastInputIsPointer = false;
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    () => {
      lastInputIsPointer = true;
    },
    true,
  );
  document.addEventListener(
    "keydown",
    () => {
      lastInputIsPointer = false;
    },
    true,
  );
}

/**
 * Marks a field while a pointer gave it focus, so that `keyboardRing` draws
 * the focus ring only when the keyboard moved focus to it.
 *
 * @internal
 */
export const pointerFocus = {
  onPointerDown(event: PointerEvent<HTMLElement>) {
    event.currentTarget.setAttribute(ATTRIBUTE, "");
  },
  onFocus(event: FocusEvent<HTMLElement>) {
    if (lastInputIsPointer) event.currentTarget.setAttribute(ATTRIBUTE, "");
  },
  onBlur(event: FocusEvent<HTMLElement>) {
    event.currentTarget.removeAttribute(ATTRIBUTE);
  },
};
