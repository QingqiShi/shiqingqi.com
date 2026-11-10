import type { FocusEvent, PointerEvent } from "react";

const ATTRIBUTE = "data-pointer-focus";

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
  onBlur(event: FocusEvent<HTMLElement>) {
    event.currentTarget.removeAttribute(ATTRIBUTE);
  },
};
