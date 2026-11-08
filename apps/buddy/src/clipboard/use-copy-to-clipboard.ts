import { useEffect, useState } from "react";

const COPIED_MS = 2000;

/** Copies `text` to the clipboard; `isCopied` stays true for a moment after a copy. */
export function useCopyToClipboard(text: string) {
  const [copiedAt, setCopiedAt] = useState<number | null>(null);

  useEffect(() => {
    if (copiedAt === null) return;
    const timer = setTimeout(() => {
      setCopiedAt(null);
    }, COPIED_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [copiedAt]);

  function copy() {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedAt(Date.now());
      })
      .catch(() => {
        // The text stays on show, so the reader can still copy it by hand.
      });
  }

  return { isCopied: copiedAt !== null, copy };
}
