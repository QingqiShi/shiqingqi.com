/**
 * Copy `text` to the system clipboard. Prefers the modern async API and
 * falls back to a hidden textarea + `document.execCommand("copy")` for
 * non-secure contexts (HTTP, file://, in-app webviews) where
 * `navigator.clipboard` is undefined or throws. `execCommand` is deprecated
 * but remains the only working path in those environments. Returns
 * `boolean` so callers can branch on success without inspecting errors.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  // `navigator.clipboard` is typed as always-defined in modern lib.dom but
  // can throw at runtime on HTTP origins or in restricted webviews. The
  // try/catch guards both the missing-API and rejected-promise cases; we
  // then drop into the legacy textarea path.
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the legacy path below.
  }
  if (typeof document === "undefined") return false;
  // Focusing the textarea moves focus off whatever had it, and removing the
  // textarea would then leave it on <body>. That is harmless for a button
  // caller but not for a keyboard handler bound to the element that had focus —
  // it would stop receiving keys after the first fallback copy.
  const previouslyFocused = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  // Wrap focus/select/exec all in one try so a synchronous throw at any step
  // (e.g. `select()` raising in restricted webviews) still hits the finally
  // block and removes the textarea from the DOM.
  let ok = false;
  try {
    textarea.focus();
    textarea.select();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- deprecated, but the only copy API that works in non-secure contexts
    ok = document.execCommand("copy");
  } catch {
    // ok stays false; the textarea is still removed in the finally block.
  } finally {
    document.body.removeChild(textarea);
    if (previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
  }
  return ok;
}
