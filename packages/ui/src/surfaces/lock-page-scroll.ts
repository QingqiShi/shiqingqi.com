/** The attribute and the variable that `react-remove-scroll-bar` gives the body, which other parts of the package read. */
const LOCK_ATTRIBUTE = "data-scroll-locked";
const BAR_SIZE = "--removed-body-scroll-bar-size";

let locks = 0;
let restore: (() => void) | null = null;

function lockCount() {
  const count = Number.parseInt(
    document.body.getAttribute(LOCK_ATTRIBUTE) ?? "0",
    10,
  );
  return Number.isFinite(count) ? count : 0;
}

function px(value: string) {
  return Number.parseInt(value, 10) || 0;
}

function writeLock() {
  const { body } = document;
  const { marginLeft, marginTop, marginRight } = getComputedStyle(body);
  const left = px(marginLeft);
  const top = px(marginTop);
  const right = px(marginRight);
  const gap = Math.max(
    0,
    window.innerWidth - document.documentElement.clientWidth + right - left,
  );
  const styles: [string, string, "important" | ""][] = [
    ["overflow", "hidden", "important"],
    ["overscroll-behavior", "contain", ""],
    ["position", "relative", "important"],
    ["padding-left", `${String(left)}px`, ""],
    ["padding-top", `${String(top)}px`, ""],
    ["padding-right", `${String(right)}px`, ""],
    ["margin-left", "0", ""],
    ["margin-top", "0", ""],
    ["margin-right", `${String(gap)}px`, "important"],
  ];
  // The variable is inherited, so a write to it styles the whole page
  // again. Write it only where a scroll bar goes.
  if (gap > 0) styles.push([BAR_SIZE, `${String(gap)}px`, ""]);
  const before = styles.map(
    ([property]) =>
      [
        property,
        body.style.getPropertyValue(property),
        body.style.getPropertyPriority(property),
      ] as const,
  );
  for (const [property, value, priority] of styles) {
    body.style.setProperty(property, value, priority);
  }
  return () => {
    for (const [property, value, priority] of before) {
      if (value === "") body.style.removeProperty(property);
      else body.style.setProperty(property, value, priority);
    }
  };
}

/**
 * Stops the page under a modal surface from scrolling, as the scroll bar
 * part of `react-remove-scroll` does, but with inline styles on the body in
 * place of a style sheet. A new style sheet makes the browser style the
 * whole page again, and that delays the first frame of the surface's motion.
 * It counts the locks in the same attribute on the body as that package, so
 * the two can be on together. Gives the function that takes the lock off.
 *
 * @internal
 */
export function lockPageScroll(): () => void {
  const { body } = document;
  body.setAttribute(LOCK_ATTRIBUTE, String(lockCount() + 1));
  locks++;
  restore ??= writeLock();
  let isLocked = true;
  return () => {
    if (!isLocked) return;
    isLocked = false;
    const left = lockCount() - 1;
    if (left > 0) body.setAttribute(LOCK_ATTRIBUTE, String(left));
    else body.removeAttribute(LOCK_ATTRIBUTE);
    locks--;
    if (locks > 0) return;
    restore?.();
    restore = null;
  };
}
