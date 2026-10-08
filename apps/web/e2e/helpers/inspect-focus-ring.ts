type FocusInspection =
  | { status: "none" }
  | { status: "repeat" }
  | { status: "ok" }
  | { status: "fail"; failure: string };

/**
 * Inspects the element that has focus after a Tab: it must draw the system
 * focus ring (a solid outline at least 2px wide in an opaque colour, on the
 * element, on its `::before`/`::after`, or for a text field on its frame), and
 * no ancestor that clips overflow may crop that ring. It first waits until
 * the element stops moving, so a scroll that brings it into view has
 * finished. Reports `repeat` once focus comes back to an element it has seen,
 * so the caller knows the tab order has wrapped. Runs in the page through
 * `page.evaluate`, so keep it standalone.
 */
export async function inspectFocusRing(): Promise<FocusInspection> {
  const TOLERANCE = 1;
  const MIN_WIDTH = 2;

  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) {
    element = element.shadowRoot.activeElement;
  }
  if (
    element === null ||
    element === document.body ||
    element === document.documentElement
  ) {
    return { status: "none" };
  }

  const page: Window & { focusRingSeen?: WeakSet<Element> } = window;
  const seen = (page.focusRingSeen ??= new WeakSet());
  if (seen.has(element)) return { status: "repeat" };
  seen.add(element);

  await waitForStillness(element);
  const label = describe(element);

  // Focus that moves into a frame belongs to that frame's document, which
  // draws its own focus. The site uses no shadow DOM, so focus inside one is
  // in a dev tool such as the Next.js overlay.
  if (element.tagName === "IFRAME" || document.activeElement?.shadowRoot) {
    return { status: "ok" };
  }

  const ring = findRing(element) ?? findFrameRing(element);
  if (ring === undefined) {
    const style = getComputedStyle(element);
    return {
      status: "fail",
      failure: `${label}: no system ring (outline: ${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor})`,
    };
  }

  // A pseudo-element has no box of its own to measure, so only a ring on an
  // element is checked for clipping.
  if (ring.pseudo === null) {
    const outset =
      parseFloat(ring.style.outlineOffset) +
      parseFloat(ring.style.outlineWidth);
    const box = ring.owner.getBoundingClientRect();
    const ringBox = {
      left: box.left - outset,
      right: box.right + outset,
      top: box.top - outset,
      bottom: box.bottom + outset,
    };
    const clipper = findClipper(ring.owner, ringBox);
    if (clipper !== null) {
      return {
        status: "fail",
        failure: `${label}: ring clipped by ${describe(clipper)}`,
      };
    }
  }

  return { status: "ok" };

  async function waitForStillness(target: Element) {
    const MAX_FRAMES = 120;
    const position = () => {
      const box = target.getBoundingClientRect();
      return `${String(box.left)},${String(box.top)}`;
    };
    let last = position();
    for (let frame = 0; frame < MAX_FRAMES; frame++) {
      await new Promise(requestAnimationFrame);
      const now = position();
      if (now === last) return;
      last = now;
    }
  }

  function findRing(owner: Element) {
    for (const pseudo of [null, "::before", "::after"]) {
      const style = getComputedStyle(owner, pseudo);
      if (drawsRing(style)) return { owner, pseudo, style };
    }
    return undefined;
  }

  // A text field with no frame of its own may leave the ring to the frame
  // that holds it, a few levels up.
  function findFrameRing(field: Element) {
    const isTextField =
      field.tagName === "TEXTAREA" ||
      (field instanceof HTMLInputElement &&
        /^(text|search|email|url|tel|password|number)$/.test(field.type)) ||
      (field instanceof HTMLElement && field.isContentEditable);
    if (!isTextField) return undefined;
    let frame = field.parentElement;
    for (let level = 0; level < 3 && frame !== null; level++) {
      const ring = findRing(frame);
      if (ring !== undefined && ring.pseudo === null) return ring;
      frame = frame.parentElement;
    }
    return undefined;
  }

  function drawsRing(style: CSSStyleDeclaration) {
    return (
      style.outlineStyle === "solid" &&
      parseFloat(style.outlineWidth) >= MIN_WIDTH &&
      isOpaque(style.outlineColor)
    );
  }

  // Chromium gives a computed colour with alpha as `rgba(r, g, b, a)`.
  function isOpaque(colour: string) {
    const alpha = /^rgba\(.*, ([\d.]+)\)$/.exec(colour)?.[1];
    return alpha === undefined || parseFloat(alpha) >= 1;
  }

  // Walks the containing-block chain: an absolutely positioned box escapes
  // static ancestors, and a fixed box escapes all but a transformed one.
  function findClipper(
    start: Element,
    ringBox: { left: number; right: number; top: number; bottom: number },
  ) {
    let position = getComputedStyle(start).position;
    for (
      let ancestor = start.parentElement;
      ancestor !== null && ancestor !== document.body;
      ancestor = ancestor.parentElement
    ) {
      const style = getComputedStyle(ancestor);
      const containsFixed =
        style.transform !== "none" ||
        style.filter !== "none" ||
        style.contain.includes("paint");
      if (position === "fixed" && !containsFixed) continue;
      if (
        position === "absolute" &&
        style.position === "static" &&
        !containsFixed
      ) {
        continue;
      }
      position = style.position;

      const clipsX = style.overflowX !== "visible";
      const clipsY = style.overflowY !== "visible";
      if (!clipsX && !clipsY) continue;
      const box = ancestor.getBoundingClientRect();
      const left = box.left + ancestor.clientLeft;
      const top = box.top + ancestor.clientTop;
      const right = left + ancestor.clientWidth;
      const bottom = top + ancestor.clientHeight;
      if (
        clipsX &&
        (ringBox.left < left - TOLERANCE || ringBox.right > right + TOLERANCE)
      ) {
        return ancestor;
      }
      if (
        clipsY &&
        (ringBox.top < top - TOLERANCE || ringBox.bottom > bottom + TOLERANCE)
      ) {
        return ancestor;
      }
    }
    return null;
  }

  function describe(node: Element) {
    const name =
      node.getAttribute("aria-label") ??
      node.getAttribute("title") ??
      node.textContent.trim().replace(/\s+/g, " ").slice(0, 40);
    return `<${node.tagName.toLowerCase()}> "${name}"`;
  }
}
