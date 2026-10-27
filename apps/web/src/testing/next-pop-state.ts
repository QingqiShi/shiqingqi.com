/** Resolves on the next `popstate`, such as after `history.back()`, which jsdom runs in a later task. */
export function nextPopState() {
  return new Promise<void>((resolve) => {
    window.addEventListener(
      "popstate",
      () => {
        resolve();
      },
      { once: true },
    );
  });
}
