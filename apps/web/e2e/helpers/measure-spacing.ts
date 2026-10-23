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

export interface EmptyFailure {
  container: string;
  empty: string;
}

export interface TextFailure {
  container: string;
  first: string;
  second: string;
  gap: number;
}

export interface PaddedRowFailure {
  container: string;
  first: string;
  second: string;
  gap: number;
}

export interface SpacingReport {
  headings: HeadingFailure[];
  stacks: StackFailure[];
  empties: EmptyFailure[];
  texts: TextFailure[];
  paddedRows: PaddedRowFailure[];
}

export interface SpacingOptions {
  /** Selectors tried in order. The first element that one matches is the root. */
  roots: string[];
  /**
   * The selector of the selected state, `selectedSelector` from
   * `@tuja/ui/primitives/selected-selector`. A selected control paints its
   * state, such as the pill of the current link, so it paints nothing at rest.
   */
  selected: string;
}

/**
 * Checks the spacing under the root: each h2, h3 and group label (a
 * `<legend>`, or the title of a `role="group"` that its `aria-labelledby`
 * names) has at least twice the space above it as below it, no two blocks in
 * a stack touch, no empty box in a stack takes a gap, which would add a
 * second gap between its neighbours, two lines of text in one item take no
 * gap smaller than `rhythm.item`, and two controls that paint nothing at rest
 * and pad themselves along the stack, such as nav links, take no gap. A line
 * box holds space above and below its letters, so such a gap looks as wide as
 * `rhythm.item`, and two lines of text may touch. A heading at h2 size or
 * larger is the exception: its letters fill its line box, so it stands at
 * least `rhythm.tight` from the text next to it. A padded control's padding
 * already spaces it. Runs in the page through `page.evaluate`, so keep it
 * standalone.
 *
 * Distances are measured between what a reader sees, not between boxes. A
 * surface (a background, a border, a shadow, a replaced element) is seen at its
 * border box. Text on no surface is seen at its content box, so the padding of
 * a ghost button or a nav link counts as space. A wrapper that paints nothing,
 * or has no box (`display: contents`), is seen as the union of what it holds.
 * A fixed element, such as a header control, floats over the page, so it is
 * not a block. A heading's distance stops at an element marked
 * `data-spacing-scope`, such as a Specimen's stage.
 */
export function measureSpacing({
  roots,
  selected,
}: SpacingOptions): SpacingReport {
  const TOLERANCE = 1;
  const root = roots
    .map((selector) => document.querySelector(selector))
    .find((element) => element !== null);
  if (root === undefined) {
    throw new Error(`No element matches ${roots.join(" or ")}`);
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

  const CONTROL =
    'button, input, select, textarea, a[href], [role="button"], [role="link"]';

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

  // An icon on a line of text is part of the text. A drawing, such as a
  // chart, is a box.
  function isIcon(el: Element) {
    const parent = el.parentElement;
    if (el.tagName.toLowerCase() !== "svg" || parent === null) return false;
    const fontSize = Number.parseFloat(styleOf(parent).fontSize);
    return el.getBoundingClientRect().height <= 1.5 * fontSize;
  }

  // Ink with no surface in it. A stage marked `data-spacing-scope` frames a
  // sample, so it is a box even when the sample is text.
  function isBareInk(el: Element) {
    if (el.textContent.trim() === "") return false;
    if (el.matches("[data-spacing-scope], :has([data-spacing-scope])")) {
      return false;
    }
    const parts = [el, ...el.querySelectorAll("*")].filter(
      (part) => part.parentElement?.closest("svg") == null,
    );
    return !parts.some((part) => isPainted(part) && !isIcon(part));
  }

  // Text with no surface in it. A block that is one control, such as a ghost
  // button or a nav link, is a box even when it paints nothing. A link inside
  // a sentence is still text.
  function isText(el: Element) {
    if (!isBareInk(el)) return false;
    const text = el.textContent.trim();
    const controls = [el, ...el.querySelectorAll(CONTROL)].filter((part) =>
      part.matches(CONTROL),
    );
    return !controls.some((control) => control.textContent.trim() === text);
  }

  function stacksChildren(el: Element) {
    const style = styleOf(el);
    return (
      (style.display.includes("flex") &&
        style.flexDirection.startsWith("column")) ||
      style.display === "block"
    );
  }

  // Whether the edge of a block that faces its neighbour is text: the first
  // line for the top edge, the last line for the bottom edge. A control that
  // paints nothing, such as a link, faces with its text.
  function facesWithText(el: Element, edge: "top" | "bottom"): boolean {
    if (isPainted(el) && !isIcon(el)) return false;
    if (el.hasAttribute("data-spacing-scope")) return false;
    if (hasOwnText(el)) return isBareInk(el);
    const shown = laidOut(el).filter((child) => visualBox(child) !== null);
    const facing = edge === "top" ? shown.at(0) : shown.at(-1);
    if (facing === undefined) return isBareInk(el);
    if (stacksChildren(el)) return facesWithText(facing, edge);
    return shown.every((child) => facesWithText(child, edge));
  }

  // The elements that hold the line of text at the edge of a block.
  function edgeLines(el: Element, edge: "top" | "bottom"): Element[] {
    if (hasOwnText(el)) return [el];
    const shown = laidOut(el).filter((child) => visualBox(child) !== null);
    const facing = edge === "top" ? shown.at(0) : shown.at(-1);
    if (facing === undefined) return [];
    if (stacksChildren(el)) return edgeLines(facing, edge);
    return shown.flatMap((child) => edgeLines(child, edge));
  }

  // The line box of an element that holds text. The box of an inline element
  // is its font's content area, which can be taller than its line box.
  function lineBox(el: Element): Box {
    const style = styleOf(el);
    const lineHeight = Number.parseFloat(style.lineHeight);
    if (style.display !== "inline" || Number.isNaN(lineHeight)) {
      return contentBox(el);
    }
    const lines = el.getClientRects();
    const first = lines[0];
    const last = lines[lines.length - 1];
    const trim = (line: DOMRect) => (line.height - lineHeight) / 2;
    return {
      top: first.top + trim(first),
      bottom: last.bottom - trim(last),
      left: first.left,
      right: last.right,
    };
  }

  // A heading at h2 size or larger. Its line height is so small that its
  // letters fill its line box.
  function isLargeLine(el: Element) {
    const style = styleOf(el);
    const size = Number.parseFloat(style.fontSize);
    const leading = Number.parseFloat(style.lineHeight) / size;
    return size >= LARGE - TOLERANCE && leading <= 1.25;
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
    const style = styleOf(el);
    if (style.display === "contents") return unionOfChildren(el);
    if (style.position === "fixed") return null;
    if (!isShown(el)) return null;
    if (isPainted(el)) {
      const { top, bottom, left, right } = el.getBoundingClientRect();
      return { top, bottom, left, right };
    }
    if (hasOwnText(el)) return contentBox(el);
    return unionOfChildren(el);
  }

  function unionOfChildren(el: Element): Box | null {
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
      // A rule on the far side of the heading is not an edge it sits against.
      const parentStyle = styleOf(parent);
      const ruledAway = isAbove
        ? hasRule(parentStyle, "bottom", "top")
        : hasRule(parentStyle, "top", "bottom");
      const onlyRuled =
        ruledAway &&
        isTransparent(parentStyle.backgroundColor) &&
        parentStyle.backgroundImage === "none" &&
        parentStyle.boxShadow === "none";
      if (isPainted(parent) && !onlyRuled) {
        return gapInside(parent.getBoundingClientRect());
      }
      node = parent;
    }
    return null;
  }

  // A label elsewhere, such as the trigger of a MenuButton, names the group
  // but is not a title above it.
  const groupLabels = [
    ...root.querySelectorAll('[role="group"][aria-labelledby]'),
  ].flatMap((group) =>
    (group.getAttribute("aria-labelledby") ?? "").split(/\s+/).flatMap((id) => {
      const label = document.getElementById(id);
      return label !== null &&
        root.contains(label) &&
        (group.contains(label) || group.previousElementSibling === label)
        ? [label]
        : [];
    }),
  );
  const titles = new Set([
    ...root.querySelectorAll("h2, h3, legend"),
    ...groupLabels,
  ]);

  const headings: HeadingFailure[] = [];
  for (const heading of titles) {
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

  // The boxes that take part in a container's layout: a box with no box of
  // its own (`display: contents`) gives its children instead.
  function laidOut(el: Element): Element[] {
    return [...el.children].flatMap((child) => {
      const style = styleOf(child);
      if (style.display === "contents") return laidOut(child);
      if (style.display === "none") return [];
      if (style.position === "absolute" || style.position === "fixed") {
        return [];
      }
      return [child];
    });
  }

  // A list or a grid of several items is a group, not one line of text. A
  // label above a group takes a gap.
  function isGroup(el: Element): boolean {
    if (hasOwnText(el)) return false;
    const shown = laidOut(el);
    if (shown.length === 1) return isGroup(shown[0]);
    if (shown.length < 2) return false;
    return el.matches("ul, ol, dl") || styleOf(el).display.endsWith("grid");
  }

  // An item that is one control, or a wrapper that paints nothing around one,
  // such as an <li> around a link.
  function soleControl(el: Element): Element | null {
    if (el.matches(CONTROL)) return el;
    if (isPainted(el) || hasOwnText(el)) return null;
    const parts = laidOut(el);
    return parts.length === 1 ? soleControl(parts[0]) : null;
  }

  function padsItself(control: Element, isColumn: boolean) {
    if (!isShown(control)) return false;
    if (isPainted(control) && !control.matches(selected)) return false;
    const style = styleOf(control);
    const sides: Side[] = isColumn ? ["top", "bottom"] : ["left", "right"];
    return sides.every(
      (side) =>
        Number.parseFloat(style.getPropertyValue(`padding-${side}`)) >
        TOLERANCE,
    );
  }

  function findPaddedRowGaps(
    container: Element,
    items: Element[],
    isColumn: boolean,
  ): PaddedRowFailure[] {
    const rows = items.map((item) => {
      const control = soleControl(item);
      return control !== null && padsItself(control, isColumn)
        ? { control, rect: control.getBoundingClientRect() }
        : null;
    });
    const failures: PaddedRowFailure[] = [];
    for (let index = 1; index < rows.length; index++) {
      const first = rows[index - 1];
      const second = rows[index];
      if (first === null || second === null) continue;
      const a = first.rect;
      const b = second.rect;
      if (!isColumn && (b.top >= a.bottom || a.top >= b.bottom)) continue;
      const gap = isColumn
        ? Math.max(b.top - a.bottom, a.top - b.bottom)
        : Math.max(b.left - a.right, a.left - b.right);
      if (gap <= TOLERANCE) continue;
      failures.push({
        container: describe(container),
        first: describe(first.control),
        second: describe(second.control),
        gap: Math.round(gap),
      });
    }
    return failures;
  }

  const ITEM = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  const TIGHT = ITEM / 2;
  // Above h3 (1.1rem), so that a fluid h2 counts at its smallest size.
  const LARGE = 1.2 * ITEM;
  function isLarge(first: Element, second: Element) {
    return [...edgeLines(first, "bottom"), ...edgeLines(second, "top")].some(
      isLargeLine,
    );
  }

  const stacks: StackFailure[] = [];
  const empties: EmptyFailure[] = [];
  const texts: TextFailure[] = [];
  const paddedRows: PaddedRowFailure[] = [];
  for (const container of root.querySelectorAll("*")) {
    const style = styleOf(container);
    const isFlex = style.display === "flex" || style.display === "inline-flex";
    const isGrid = style.display === "grid" || style.display === "inline-grid";
    if (!isFlex && !isGrid) continue;
    const isColumn =
      (isFlex && style.flexDirection.startsWith("column")) ||
      (isGrid && style.gridTemplateColumns.trim().split(/\s+/).length === 1);
    const isRow = isFlex && style.flexDirection.startsWith("row");
    const isCluster = isRow && style.flexWrap === "wrap";
    if (!isColumn && !isRow) continue;
    if (container.closest(OUT_OF_SCOPE) !== null || !isShown(container)) {
      continue;
    }

    const items = laidOut(container);
    // On a track that the container paints, such as a SegmentedControl, the
    // items are segments of one control, and the gap shows the track.
    if (!isPainted(container)) {
      paddedRows.push(...findPaddedRowGaps(container, items, isColumn));
    }

    if (!isColumn && !isCluster) continue;

    const gapSize = Number.parseFloat(
      isColumn ? style.rowGap : style.columnGap,
    );
    if (gapSize > TOLERANCE && items.length > 1) {
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        const size = isColumn ? rect.height : rect.width;
        // A hairline rule is drawn, so it takes its gaps on purpose.
        if (size > TOLERANCE || isPainted(item)) continue;
        empties.push({ container: describe(container), empty: describe(item) });
      }
    }

    // Flex `order` can show the items in another order than the DOM.
    const shownInOrder = items.toSorted(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    );
    if (isColumn && gapSize > TOLERANCE && gapSize < ITEM - TOLERANCE) {
      for (let index = 1; index < shownInOrder.length; index++) {
        const first = shownInOrder[index - 1];
        const second = shownInOrder[index];
        if (!isText(first) || !isText(second)) continue;
        if (isGroup(first) || isGroup(second)) continue;
        if (isLarge(first, second)) continue;
        texts.push({
          container: describe(container),
          first: describe(first),
          second: describe(second),
          gap: Math.round(gapSize),
        });
      }
    }

    if (isColumn) {
      for (let index = 1; index < shownInOrder.length; index++) {
        const first = shownInOrder[index - 1];
        const second = shownInOrder[index];
        if (!facesWithText(first, "bottom") || !facesWithText(second, "top")) {
          continue;
        }
        if (!isLarge(first, second)) continue;
        const above = edgeLines(first, "bottom").map(lineBox);
        const below = edgeLines(second, "top").map(lineBox);
        const gap =
          Math.min(...below.map((box) => box.top)) -
          Math.max(...above.map((box) => box.bottom));
        if (gap >= TIGHT - TOLERANCE) continue;
        texts.push({
          container: describe(container),
          first: describe(first),
          second: describe(second),
          gap: Math.round(gap),
        });
      }
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
      if (
        facesWithText(previous.child, "bottom") &&
        facesWithText(following.child, "top")
      ) {
        continue;
      }
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

  return { headings, stacks, empties, texts, paddedRows };
}
