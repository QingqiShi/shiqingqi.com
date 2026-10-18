/**
 * Puts `html` in the body, in place of what was there, and returns its
 * element with the `data-target` attribute.
 *
 * @internal
 */
export function mount(html: string) {
  document.body.innerHTML = html;
  const target = document.querySelector("[data-target]");
  if (target === null) {
    throw new Error("no target");
  }
  return target;
}
