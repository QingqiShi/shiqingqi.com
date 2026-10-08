interface TouchTargetInspection {
  checked: number;
  failures: string[];
}

/**
 * Inspects every control that carries the touch target of `a11y.touchTarget`,
 * found by its signature: `touch-action: manipulation` and no tap highlight.
 *
 * - A control takes a tap across at least 44px in each axis, through its
 *   centre. A point outside the control may go to a neighbouring control
 *   instead, because two hit areas share the gap between them. It may not go
 *   to anything else, such as an ancestor that clips the hit area.
 * - A control keeps every tap on its own visible box. A neighbouring
 *   control's hit area that covers it steals those taps.
 *
 * Runs in the page through `page.evaluate`, so keep it standalone.
 */
export function inspectTouchTargets(): TouchTargetInspection {
  const MIN_SIZE = 44;
  const TOLERANCE = 0.5;
  const failures: string[] = [];
  let checked = 0;

  const controls = [...document.querySelectorAll("*")].filter(isControl);
  const controlSet = new Set(controls);
  for (const control of controls) {
    if (!isTappable(control)) continue;
    control.scrollIntoView({ block: "center", inline: "center" });
    const box = control.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const centreX = (box.left + box.right) / 2;
    const centreY = (box.top + box.bottom) / 2;
    // A control under a modal scrim or another layer takes no tap at all.
    const atCentre = document.elementFromPoint(centreX, centreY);
    if (atCentre === null || !control.contains(atCentre)) continue;
    checked++;
    const label = describe(control);

    const hit = hitSize(control, box);
    if (hit.width < MIN_SIZE - TOLERANCE || hit.height < MIN_SIZE - TOLERANCE) {
      failures.push(
        `${label}: hit area ${hit.width.toFixed(1)}x${hit.height.toFixed(1)}, smaller than ${String(MIN_SIZE)}px`,
      );
      continue;
    }

    const reach = MIN_SIZE / 2 - 1;
    const points: [number, number][] = [
      [centreX - reach, centreY],
      [centreX + reach, centreY],
      [centreX, centreY - reach],
      [centreX, centreY + reach],
      [box.left + 1, centreY],
      [box.right - 1, centreY],
      [centreX, box.top + 1],
      [centreX, box.bottom - 1],
    ];
    for (const [x, y] of points) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const target = document.elementFromPoint(x, y);
      if (target === null) continue;
      const onOwnBox = contains(box, x, y);
      if (control.contains(target)) {
        const victim = onOwnBox ? undefined : coveredField(control, x, y);
        if (victim !== undefined) {
          failures.push(`${label}: takes taps from ${describe(victim)}`);
          break;
        }
        continue;
      }
      const owner = controlOf(target);
      if (onOwnBox) {
        // Something that is not a control, such as a sticky header, can
        // cover the control, and so can another control that is drawn on
        // top of it, such as an open menu. Neither is a fault of a hit area.
        if (
          owner !== null &&
          !owner.contains(control) &&
          !contains(owner.getBoundingClientRect(), x, y)
        ) {
          failures.push(`${label}: ${describe(owner)} takes taps on its edge`);
          break;
        }
      } else if (owner === null) {
        failures.push(
          `${label}: hit area covered by ${describe(target)} at ${point(x, y, box)}`,
        );
        break;
      }
    }
  }
  // A small button that does not start from the primitives has no hit area
  // at all.
  for (const node of document.querySelectorAll('button, [role="button"]')) {
    if (controlSet.has(node) || !isTappable(node)) continue;
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    checked++;
    if (box.width < MIN_SIZE - TOLERANCE || box.height < MIN_SIZE - TOLERANCE) {
      failures.push(
        `${describe(node)}: ${box.width.toFixed(1)}x${box.height.toFixed(1)}, with no touch target`,
      );
    }
  }
  return { checked, failures };

  function isControl(node: Element) {
    const style = getComputedStyle(node);
    return (
      style.touchAction === "manipulation" &&
      style.getPropertyValue("-webkit-tap-highlight-color") ===
        "rgba(0, 0, 0, 0)"
    );
  }

  function isTappable(node: Element) {
    if (node.closest("[inert]") !== null) return false;
    if (getComputedStyle(node).pointerEvents === "none") return false;
    return node.checkVisibility({
      visibilityProperty: true,
      contentVisibilityAuto: true,
    });
  }

  // The element that takes input of its own, such as a text field or a plain
  // link, and that would get the tap at this point if the hit area were not
  // there. Another control is left out: its own check finds a hit area that
  // covers it.
  function coveredField(node: Element, x: number, y: number) {
    const below = document
      .elementsFromPoint(x, y)
      .find((under) => !node.contains(under) && !under.contains(node));
    const field = below?.closest(
      'a[href], button, input, textarea, select, summary, label, [contenteditable="true"], [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="option"], [role="menuitem"], [role="slider"]',
    );
    if (field === null || field === undefined) return undefined;
    if (field.contains(node) || controlOf(field) !== null) return undefined;
    return field;
  }

  function controlOf(node: Element) {
    for (let at: Element | null = node; at !== null; at = at.parentElement) {
      if (controlSet.has(at)) return at;
    }
    return null;
  }

  function hitSize(node: Element, box: DOMRect) {
    const after = getComputedStyle(node, "::after");
    if (after.content === "none" || after.position !== "absolute") {
      return { width: box.width, height: box.height };
    }
    return {
      width: Math.max(box.width, parseFloat(after.width)),
      height: Math.max(box.height, parseFloat(after.height)),
    };
  }

  function contains(rect: DOMRect, x: number, y: number) {
    return x > rect.left && x < rect.right && y > rect.top && y < rect.bottom;
  }

  function point(x: number, y: number, box: DOMRect) {
    const dx = x - (box.left + box.right) / 2;
    const dy = y - (box.top + box.bottom) / 2;
    return `(${dx.toFixed(0)}, ${dy.toFixed(0)}) from its centre`;
  }

  function describe(node: Element) {
    const name =
      node.getAttribute("aria-label") ??
      node.getAttribute("title") ??
      node.textContent.trim().replace(/\s+/g, " ").slice(0, 40);
    return `<${node.tagName.toLowerCase()}> "${name}"`;
  }
}

/**
 * Lists every scroll container, the page included, that can scroll only
 * because a hit area extends past the edge of its content. It turns each hit
 * area off, measures again, and then turns it back on. Runs in the page
 * through `page.evaluate`, so keep it standalone.
 */
export function findHitAreaOverflow(): string[] {
  const ATTRIBUTE = "data-hit-area-off";
  const hosts: Element[] = [];
  const scrollers: Element[] = [document.documentElement];
  for (const node of document.querySelectorAll("*")) {
    const style = getComputedStyle(node);
    if (/auto|scroll/.test(`${style.overflowX} ${style.overflowY}`)) {
      scrollers.push(node);
    }
    if (style.touchAction !== "manipulation") continue;
    const after = getComputedStyle(node, "::after");
    if (
      after.content !== "none" &&
      after.position === "absolute" &&
      after.zIndex === "-1"
    ) {
      hosts.push(node);
    }
  }
  const measure = () =>
    scrollers.map((node) => ({
      x: node.scrollWidth - node.clientWidth,
      y: node.scrollHeight - node.clientHeight,
    }));

  const withHitAreas = measure();
  const off = document.createElement("style");
  off.textContent = `[${ATTRIBUTE}]::after { content: none !important; }`;
  document.head.append(off);
  for (const host of hosts) host.setAttribute(ATTRIBUTE, "");
  const withoutHitAreas = measure();
  for (const host of hosts) host.removeAttribute(ATTRIBUTE);
  off.remove();

  const failures: string[] = [];
  scrollers.forEach((node, index) => {
    for (const axis of ["x", "y"] as const) {
      const before = withoutHitAreas[index][axis];
      const after = withHitAreas[index][axis];
      if (before <= 0 && after > 0) {
        const name = (
          node.getAttribute("aria-label") ??
          node.textContent.trim().replace(/\s+/g, " ")
        ).slice(0, 40);
        failures.push(
          `<${node.tagName.toLowerCase()}> "${name}": scrolls ${String(after)}px on ${axis} only because of a hit area`,
        );
      }
    }
  });
  return failures;
}
