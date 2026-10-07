export interface HeadingFailure {
  heading: string;
  above: number;
  below: number;
}

export interface StackFailure {
  container: string;
  first: string;
  second: string;
}

export interface SpacingReport {
  headings: HeadingFailure[];
  stacks: StackFailure[];
}

/**
 * Checks the spacing under the first element that `rootSelectors` matches, in
 * order: each h2 and h3 has at least twice the space above it as below it, and
 * no two blocks in a stack touch. Runs in the page through `page.evaluate`, so
 * keep it standalone.
 *
 * Distances are measured between what a reader sees, not between boxes. A
 * surface (a background, a border, a shadow, a replaced element) is seen at its
 * border box. Text on no surface is seen at its content box, so the padding of
 * a ghost button or a nav link counts as space. A wrapper that paints nothing
 * is seen as the union of what it holds. A heading's distance stops at an
 * element marked `data-spacing-scope`, such as a Specimen's stage.
 */
export function measureSpacing(rootSelectors: string[]): SpacingReport {
  const TOLERANCE = 1;
  const root = rootSelectors
    .map((selector) => document.querySelector(selector))
    .find((element) => element !== null);
  if (root === undefined) {
    throw new Error(`No element matches ${rootSelectors.join(" or ")}`);
  }

  // Content whose spacing is not a stack of blocks: drawn illustrations,
  // inert overview tiles, code, and composite widgets whose items abut on
  // purpose.
  const OUT_OF_SCOPE = [
    '[aria-hidden="true"]',
    "[inert]",
    "pre",
    '[role="menu"]',
    '[role="menubar"]',
    '[role="listbox"]',
    '[role="tablist"]',
    '[role="toolbar"]',
    '[role="grid"]',
    '[role="tree"]',
    "table",
  ].join(",");

  const REPLACED = new Set([
    "IMG",
    "SVG",
    "CANVAS",
    "VIDEO",
    "IFRAME",
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "HR",
  ]);

  type Side = "top" | "right" | "bottom" | "left";

  interface Box {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }

  const styles = new WeakMap<Element, CSSStyleDeclaration>();
  function styleOf(el: Element) {
    let style = styles.get(el);
    if (style === undefined) {
      style = getComputedStyle(el);
      styles.set(el, style);
    }
    return style;
  }

  // Only an alpha of zero is transparent. Opaque black, rgb(0, 0, 0), also
  // ends in ", 0)".
  function isTransparent(value: string) {
    return (
      value === "transparent" ||
      /^rgba\(.*,\s*0\)$/.test(value) ||
      /\/\s*0\)$/.test(value)
    );
  }

  function isShown(el: Element) {
    const rect = el.getBoundingClientRect();
    // A hairline rule is seen, but a visually hidden 1px box is not.
    if (rect.width * rect.height <= 1) return false;
    const style = styleOf(el);
    return style.visibility !== "hidden" && style.opacity !== "0";
  }

  function hasBorder(style: CSSStyleDeclaration, side: Side) {
    return (
      Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
      style.getPropertyValue(`border-${side}-style`) !== "none" &&
      !isTransparent(style.getPropertyValue(`border-${side}-color`))
    );
  }

  function isPainted(el: Element) {
    if (REPLACED.has(el.tagName.toUpperCase())) return true;
    const style = styleOf(el);
    if (!isTransparent(style.backgroundColor)) return true;
    if (style.backgroundImage !== "none") return true;
    if (style.boxShadow !== "none") return true;
    return (["top", "right", "bottom", "left"] as const).some((side) =>
      hasBorder(style, side),
    );
  }

  // A border on one side only is a rule drawn between two blocks. A border
  // all the way round is the edge of a surface.
  function hasRule(style: CSSStyleDeclaration, side: Side, opposite: Side) {
    return hasBorder(style, side) && !hasBorder(style, opposite);
  }

  function hasOwnText(el: Element) {
    return [...el.childNodes].some(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        (node.textContent ?? "").trim() !== "",
    );
  }

  function contentBox(el: Element): Box {
    const style = styleOf(el);
    const rect = el.getBoundingClientRect();
    const inset = (side: Side) =>
      Number.parseFloat(style.getPropertyValue(`padding-${side}`)) +
      Number.parseFloat(style.getPropertyValue(`border-${side}-width`));
    return {
      top: rect.top + inset("top"),
      bottom: rect.bottom - inset("bottom"),
      left: rect.left + inset("left"),
      right: rect.right - inset("right"),
    };
  }

  const boxes = new WeakMap<Element, Box | null>();
  function visualBox(el: Element): Box | null {
    if (boxes.has(el)) return boxes.get(el) ?? null;
    const box = measureVisualBox(el);
    boxes.set(el, box);
    return box;
  }

  function measureVisualBox(el: Element): Box | null {
    if (!isShown(el)) return null;
    if (isPainted(el)) {
      const { top, bottom, left, right } = el.getBoundingClientRect();
      return { top, bottom, left, right };
    }
    if (hasOwnText(el)) return contentBox(el);
    let union: Box | null = null;
    for (const child of el.children) {
      const box = visualBox(child);
      if (box === null) continue;
      union =
        union === null
          ? box
          : {
              top: Math.min(union.top, box.top),
              bottom: Math.max(union.bottom, box.bottom),
              left: Math.min(union.left, box.left),
              right: Math.max(union.right, box.right),
            };
    }
    return union;
  }

  function describe(el: Element) {
    const text = el.textContent.replace(/\s+/g, " ").trim();
    const label = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    return `<${el.tagName.toLowerCase()}> "${label}"`;
  }

  // The space from a heading's edge to the nearest block in one direction. A
  // surface the heading sits on is a block too, at its inner edge. Null when
  // nothing in the root lies that way.
  function distance(heading: Element, direction: "above" | "below") {
    const rect = heading.getBoundingClientRect();
    const isAbove = direction === "above";
    const next = (el: Element) =>
      isAbove ? el.previousElementSibling : el.nextElementSibling;
    // A block beside the heading, as in a grid row, is not above or below it.
    const isPast = (box: Box) =>
      isAbove
        ? box.bottom <= rect.top + TOLERANCE
        : box.top >= rect.bottom - TOLERANCE;
    const gapTo = (box: Box) =>
      isAbove ? rect.top - box.bottom : box.top - rect.bottom;
    const gapInside = (edge: Box) =>
      isAbove ? rect.top - edge.top : edge.bottom - rect.bottom;

    let node: Element = heading;
    while (node !== root) {
      for (
        let sibling = next(node);
        sibling !== null;
        sibling = next(sibling)
      ) {
        const box = visualBox(sibling);
        if (box !== null && isPast(box)) return gapTo(box);
      }
      const parent = node.parentElement;
      if (parent === null || parent.hasAttribute("data-spacing-scope")) {
        return null;
      }
      if (isPainted(parent)) return gapInside(parent.getBoundingClientRect());
      node = parent;
    }
    return null;
  }

  const headings: HeadingFailure[] = [];
  for (const heading of root.querySelectorAll("h2, h3")) {
    if (heading.closest(OUT_OF_SCOPE) !== null || !isShown(heading)) continue;
    const above = distance(heading, "above");
    const below = distance(heading, "below");
    if (above === null || below === null) continue;
    if (above + TOLERANCE < 2 * below) {
      headings.push({
        heading: describe(heading),
        above: Math.round(above),
        below: Math.round(below),
      });
    }
  }

  const stacks: StackFailure[] = [];
  for (const container of root.querySelectorAll("*")) {
    const style = styleOf(container);
    const isFlex = style.display === "flex" || style.display === "inline-flex";
    const isGrid = style.display === "grid" || style.display === "inline-grid";
    if (!isFlex && !isGrid) continue;
    const isColumn =
      (isFlex && style.flexDirection.startsWith("column")) ||
      (isGrid && style.gridTemplateColumns.trim().split(/\s+/).length === 1);
    const isCluster =
      isFlex && style.flexDirection === "row" && style.flexWrap === "wrap";
    if (!isColumn && !isCluster) continue;
    if (container.closest(OUT_OF_SCOPE) !== null || !isShown(container)) {
      continue;
    }

    const children = [...container.children].flatMap((child) => {
      const childStyle = styleOf(child);
      if (childStyle.position === "absolute" || childStyle.position === "fixed")
        return [];
      const box = visualBox(child);
      return box === null ? [] : [{ child, childStyle, box }];
    });

    for (let index = 1; index < children.length; index++) {
      const previous = children[index - 1];
      const following = children[index];
      const sameLine =
        following.box.top < previous.box.bottom &&
        previous.box.top < following.box.bottom;
      // A cluster's lines are checked along the line; its wrap is not.
      if (isCluster && !sameLine) continue;
      const gap = isColumn
        ? following.box.top - previous.box.bottom
        : following.box.left - previous.box.right;
      // Overlap is deliberate, as in an avatar stack.
      if (gap < -TOLERANCE || gap > TOLERANCE) continue;
      const ruled = isColumn
        ? hasRule(previous.childStyle, "bottom", "top") ||
          hasRule(following.childStyle, "top", "bottom")
        : hasRule(previous.childStyle, "right", "left") ||
          hasRule(following.childStyle, "left", "right");
      if (ruled) continue;
      stacks.push({
        container: describe(container),
        first: describe(previous.child),
        second: describe(following.child),
      });
    }
  }

  return { headings, stacks };
}
