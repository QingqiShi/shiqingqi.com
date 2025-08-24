import { flushSync } from "react-dom";

/** Wrapper around document.startViewTransition to fallback gracefully */
export async function startViewTransition(
  callback: () => void | Promise<void>,
) {
  if (!("startViewTransition" in document)) {
    await callback();
    return;
  }

  return document.startViewTransition(() => flushSync(callback));
}
