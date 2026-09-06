import { useEffect, useRef } from "react";

// Escape closes the overlay opened last, so a picker over a sheet closes
// before the sheet does.
const escapeStack: { close: () => void }[] = [];

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const top = escapeStack.at(-1);
  if (!top) return;
  event.preventDefault();
  top.close();
});

export function useEscape(isOpen: boolean, close: () => void): void {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!isOpen) return;
    const entry = {
      close: () => {
        closeRef.current();
      },
    };
    escapeStack.push(entry);
    return () => {
      escapeStack.splice(escapeStack.indexOf(entry), 1);
    };
  }, [isOpen]);
}
