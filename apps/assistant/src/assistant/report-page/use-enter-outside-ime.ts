import { useRef, type CompositionEvent, type KeyboardEvent } from "react";

/** The text of a field that takes one line, where a pasted line break is a space. */
export function oneLine(text: string) {
  return text.replaceAll(/\s*\n\s*/g, " ").trim();
}

const IME_ENTER_MS = 50;

/**
 * Reads the Enter key in a field where the owner can type Chinese. Safari ends a
 * composition before the keydown of the Enter that confirms it, so `isComposing`
 * is false. Thus an Enter directly after the end of a composition does not count.
 */
export function useEnterOutsideIme(onEnter: () => void) {
  const compositionEndRef = useRef(Number.NEGATIVE_INFINITY);
  return {
    onCompositionEnd: (event: CompositionEvent<HTMLElement>) => {
      compositionEndRef.current = event.timeStamp;
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (
        event.key === "Enter" &&
        !event.nativeEvent.isComposing &&
        event.timeStamp - compositionEndRef.current > IME_ENTER_MS
      ) {
        event.preventDefault();
        onEnter();
      }
    },
  };
}
