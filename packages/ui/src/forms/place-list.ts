/** The gap between the field and the list, and the least room it leaves at the edge of the screen, in px. */
const GAP = 4;
const EDGE = 8;
/** Below this room, in px, the list opens above the field if there is more room there. */
const LEAST_ROOM = 176;

/**
 * Puts the list under the field, or above it when there is more room there,
 * and makes it no taller than that room. The room is the part of the screen
 * that the visitor sees, less an on-screen keyboard, inside each box around
 * the field that clips or scrolls, such as a sheet.
 *
 * @internal
 */
export function placeList(
  area: { top: number; height: number },
  root: HTMLElement,
  input: HTMLElement,
  list: HTMLElement,
) {
  let top = area.top - window.scrollY;
  let bottom = top + area.height;
  for (let box = root.parentElement; box; box = box.parentElement) {
    if (getComputedStyle(box).overflowY === "visible") continue;
    const clip = box.getBoundingClientRect();
    top = Math.max(top, clip.top);
    bottom = Math.min(bottom, clip.bottom);
  }
  const field = input.getBoundingClientRect();
  const box = root.getBoundingClientRect();
  const below = bottom - field.bottom - GAP - EDGE;
  const above = field.top - top - GAP - EDGE;
  const isAbove = below < LEAST_ROOM && above > below;
  list.style.maxBlockSize = `min(18rem, ${String(Math.max(0, isAbove ? above : below))}px)`;
  list.style.insetBlockStart = isAbove
    ? "auto"
    : `${String(field.bottom - box.top + GAP)}px`;
  list.style.insetBlockEnd = isAbove
    ? `${String(box.bottom - field.top + GAP)}px`
    : "auto";
}
