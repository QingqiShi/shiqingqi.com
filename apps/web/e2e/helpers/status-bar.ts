/**
 * The fixed or sticky boxes Safari on iOS would sample for the colour of its
 * chrome: the ones under the top-centre or the bottom-centre of the viewport
 * that WebKit does not walk past. The top point colours the status bar, the
 * bottom point the band under the toolbar.
 *
 * With a selector as `within`, it checks every fixed or sticky box in that
 * element and around it, wherever the box is now: a box that crosses a
 * sample point only while it animates or is dragged still latches its colour.
 *
 * Runs in the page through `page.evaluate`, so keep it standalone. The rules
 * it mirrors are in the `ios-status-bar` skill.
 */
export function findStatusBarCandidates(within?: unknown) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const pointX = viewportWidth / 2;
  const points = [4, document.documentElement.clientHeight - 4];

  let elements: Element[];
  if (typeof within !== "string") {
    elements = [...document.querySelectorAll("body *")];
  } else {
    const root = document.querySelector(within);
    if (!root) {
      throw new Error(`No element matches ${within}`);
    }
    const ancestors: Element[] = [];
    for (let node = root.parentElement; node; node = node.parentElement) {
      ancestors.push(node);
    }
    elements = [root, ...root.querySelectorAll("*"), ...ancestors];
  }

  return elements
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const coversPoint = points.some(
        (pointY) =>
          rect.left <= pointX &&
          pointX <= rect.right &&
          rect.top <= pointY &&
          pointY <= rect.bottom,
      );
      if (typeof within !== "string" && !coversPoint) {
        return false;
      }

      const style = getComputedStyle(element);
      if (style.position !== "fixed" && style.position !== "sticky") {
        return false;
      }
      if (style.visibility === "hidden") {
        return false;
      }

      const isTransparent = style.backgroundColor === "rgba(0, 0, 0, 0)";
      // WebKit samples a replaced element even with no children and no
      // background, so a bare fixed <canvas> element is a candidate.
      const isReplaced = element.matches(
        "canvas, img, video, audio, iframe, embed, object, svg",
      );
      const hasChild = [...element.childNodes].some(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
      );
      const isNearlyTransparent =
        !isReplaced &&
        !hasChild &&
        isTransparent &&
        style.backdropFilter === "none";
      if (isNearlyTransparent) {
        return false;
      }

      const isWide = rect.width >= viewportWidth * 0.9;
      const isTall = rect.height >= viewportHeight * 0.9;
      if (!isWide && !isTall) {
        return false;
      }
      // WebKit skips a box taller than the viewport with no background, and a
      // viewport-sized box behind the page.
      if (rect.height >= viewportHeight * 1.05 && isTransparent) {
        return false;
      }
      return !(isWide && isTall && Number(style.zIndex) < 0);
    })
    .map(
      (element) =>
        `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`,
    );
}
