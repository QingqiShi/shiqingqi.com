import type { FlowBlock, FlowOffset } from "./read-flow.ts";

const TOLERANCE = 1;

const warned = new WeakSet<Node>();

function nameOf(element: Element) {
  const id = element.getAttribute("data-testid") ?? element.id;
  const label = id === "" ? "" : `#${id}`;
  const text = element.textContent.trim().slice(0, 40);
  return `<${element.tagName.toLowerCase()}${label}> "${text}"`;
}

function warn(node: Node, message: string) {
  if (warned.has(node)) return;
  warned.add(node);
  console.warn(`Flow: ${message}`, node);
}

const isTransparent = (color: string) =>
  color === "transparent" || /\/ 0\)$|, 0\)$/.test(color);

function paintsSurface(style: CSSStyleDeclaration) {
  if (!isTransparent(style.backgroundColor)) return true;
  if (style.backgroundImage !== "none" || style.boxShadow !== "none") {
    return true;
  }
  // A border on the top only does not change with the height.
  return (["Right", "Bottom", "Left"] as const).some(
    (side) =>
      Number.parseFloat(style[`border${side}Width`]) > 0 &&
      style[`border${side}Style`] !== "none" &&
      !isTransparent(style[`border${side}Color`]),
  );
}

function rectOfText(text: Text) {
  const range = document.createRange();
  range.selectNodeContents(text);
  // jsdom has no box for a range.
  return "getBoundingClientRect" in range
    ? range.getBoundingClientRect()
    : null;
}

interface Place {
  readonly x: number;
  /** A scroll that a layout clamps must not count. */
  readonly y: number;
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
}

/**
 * The check of a press in development: it walks the whole document, so it does
 * not ship. It reports what the blocks do not cover, as each one shows a jump
 * or a wrong paint at the press:
 *
 * - an element or a text in the flow that moves outside each registered block;
 * - a surface that changes its height, and no block with a skin paints it;
 * - a `position: fixed` box in a block that moves, as it then moves with it;
 * - a positioned box with no `z-index`, before a block that moves and under it;
 * - a block that moves and has its own CSS `translate`, as the motion replaces it;
 * - a scroller around the panel that no Scroll region declares.
 *
 * @internal
 */
export function beginFlowCheck(
  root: Element,
  scroller: Element,
  blocks: ReadonlySet<FlowBlock>,
) {
  let open = new Map<Node, Place>();
  let closed = new Map<Node, Place>();

  function capture(layout: "open" | "closed") {
    const places = new Map<Node, Place>();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    );
    for (
      let node = walker.nextNode();
      node !== null;
      node = walker.nextNode()
    ) {
      if (node instanceof Text && node.data.trim() === "") continue;
      const rect =
        node instanceof Text
          ? rectOfText(node)
          : node instanceof Element
            ? node.getBoundingClientRect()
            : null;
      if (rect === null || (rect.width === 0 && rect.height === 0)) continue;
      places.set(node, {
        x: rect.left,
        y: rect.top + (scroller.contains(node) ? scroller.scrollTop : 0),
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
      });
    }
    if (layout === "open") open = places;
    else closed = places;
  }

  function report(
    offsets: ReadonlyMap<Element, FlowOffset>,
    isAnchored: boolean,
  ) {
    const surfaces = new Set<Element>();
    for (const block of blocks) {
      if (block.surface !== null && block.element !== null) {
        surfaces.add(block.element);
      }
    }

    const moved: { element: Element; place: Place }[] = [];
    const movedBlocks = [...offsets]
      .filter(([, { dx, dy }]) => Math.hypot(dx, dy) >= TOLERANCE)
      .map(([block]) => block);
    const positioned: { box: Element; offset: FlowOffset }[] = [];

    for (const block of movedBlocks) {
      const { translate } = getComputedStyle(block);
      if (translate !== "" && translate !== "none") {
        warn(
          block,
          `${nameOf(block)} has its own translate, and the motion replaces it. Put the translate on a box in the block.`,
        );
      }
    }

    const visit = (
      element: Element,
      outer: FlowOffset,
      parentDelta: FlowOffset | null,
      isOnScreen: boolean,
    ) => {
      const style = getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        element.hasAttribute("data-flow-skin")
      ) {
        return;
      }
      const offset = offsets.get(element) ?? outer;
      const from = open.get(element);
      const to = closed.get(element);
      const isMoving = Math.hypot(offset.dx, offset.dy) >= TOLERANCE;

      const holdsRoot = element.contains(root);
      if (
        !holdsRoot &&
        style.position !== "static" &&
        style.zIndex === "auto"
      ) {
        positioned.push({ box: element, offset });
      }
      if (style.position === "fixed" && !holdsRoot) {
        if (isMoving) {
          warn(
            element,
            `the fixed box ${nameOf(element)} is in a block that moves, so it moves with the block. Portal it.`,
          );
        }
        return;
      }
      if (style.position === "absolute" && !holdsRoot) {
        if (
          isMoving &&
          element instanceof HTMLElement &&
          !movedBlocks.some(
            (block) =>
              block.contains(element) &&
              element.offsetParent !== null &&
              block.contains(element.offsetParent),
          )
        ) {
          warn(
            element,
            `${nameOf(element)} has a containing block outside the block that moves, so it shows in another place during the motion.`,
          );
        }
        return;
      }
      if (offsets.has(element) && isMoving && from !== undefined) {
        moved.push({ element, place: from });
      }

      let delta: FlowOffset | null = null;
      let staysOnScreen = isOnScreen;
      if (from !== undefined && to !== undefined) {
        // A stuck box stays on the screen when the scroll changes.
        staysOnScreen ||=
          style.position === "sticky" &&
          Math.abs(to.top - from.top) < TOLERANCE;
        delta = {
          dx: to.x - from.x,
          dy: staysOnScreen ? to.top - from.top : to.y - from.y,
        };
        const isOff =
          Math.abs(delta.dx - offset.dx) >= TOLERANCE ||
          Math.abs(delta.dy - offset.dy) >= TOLERANCE;
        const isSame =
          parentDelta !== null &&
          Math.abs(delta.dx - parentDelta.dx) < TOLERANCE &&
          Math.abs(delta.dy - parentDelta.dy) < TOLERANCE;
        // What a scroll anchor keeps above the screen shows no jump.
        const isAboveScreen =
          staysOnScreen && Math.max(from.bottom, to.bottom) <= 0;
        if (isOff && !isSame && !isAboveScreen) {
          const holdsBlock = [...offsets.keys()].some(
            (block) => block !== element && element.contains(block),
          );
          if (!holdsBlock || paintsSurface(style)) {
            warn(
              element,
              `${nameOf(element)} moves ${delta.dy.toFixed(1)} px at the press, outside each registered block. Register it, or a block around it.`,
            );
            return;
          }
          delta = null;
        }
        if (
          Math.abs(to.height - from.height) >= TOLERANCE &&
          // A lower edge past the screen shows no jump, such as that of the page.
          Math.min(from.bottom, to.bottom) < window.innerHeight - TOLERANCE &&
          !surfaces.has(element) &&
          paintsSurface(style)
        ) {
          warn(
            element,
            `${nameOf(element)} paints a surface that changes its height at the press, and no block with a skin paints it.`,
          );
        }
      }

      for (const child of element.childNodes) {
        if (child === root) continue;
        if (child instanceof Element) {
          visit(child, offset, delta, staysOnScreen);
        } else if (child instanceof Text) {
          const textFrom = open.get(child);
          const textTo = closed.get(child);
          if (textFrom === undefined || textTo === undefined) continue;
          const textDy = staysOnScreen
            ? textTo.top - textFrom.top
            : textTo.y - textFrom.y;
          if (
            Math.abs(textDy - offset.dy) >= TOLERANCE &&
            (delta === null || Math.abs(textDy - delta.dy) >= TOLERANCE)
          ) {
            warn(
              child,
              `the text "${child.data.trim().slice(0, 40)}" moves ${textDy.toFixed(1)} px at the press, outside each registered block.`,
            );
          }
        }
      }
    };
    visit(document.body, { dx: 0, dy: 0 }, null, isAnchored);

    const hasOwnPlane = (element: Element, box: Element) => {
      for (
        let node: Element | null = element;
        node !== null && !node.contains(box);
        node = node.parentElement
      ) {
        if (getComputedStyle(node).zIndex !== "auto") return true;
      }
      return false;
    };

    for (const { element, place } of moved) {
      const rect = element.getBoundingClientRect();
      const end = closed.get(element);
      for (const { box, offset } of positioned) {
        const at = open.get(box);
        if (
          at === undefined ||
          root.contains(box) ||
          element.contains(box) ||
          hasOwnPlane(element, box) ||
          box.compareDocumentPosition(element) !==
            Node.DOCUMENT_POSITION_FOLLOWING
        ) {
          continue;
        }
        const boxRect = box.getBoundingClientRect();
        const reach = (end?.y ?? place.y) - place.y - offset.dy;
        if (
          at.y + TOLERANCE < place.y + place.height + Math.max(0, reach) &&
          place.y + Math.min(0, reach) + TOLERANCE < at.y + at.height &&
          boxRect.left < rect.right &&
          rect.left < boxRect.right
        ) {
          warn(
            box,
            `the positioned box ${nameOf(box)} has no z-index and is before ${nameOf(element)}, so it shows under that block during the motion.`,
          );
        }
      }
    }

    for (
      let node = root.parentElement;
      node !== null && node !== document.body;
      node = node.parentElement
    ) {
      if (node === scroller) break;
      const { overflowY } = getComputedStyle(node);
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight
      ) {
        warn(
          node,
          `${nameOf(node)} scrolls around the panel, and no useScrollRegion declares it.`,
        );
        break;
      }
    }
  }

  return { capture, report };
}
