/**
 * The fixed or sticky boxes Safari on iOS would sample for the status-bar
 * colour: the ones under the top-centre of the viewport that WebKit does not
 * walk past. Runs in the page through `page.evaluate`, so keep it standalone.
 * The rules it mirrors are in the `ios-status-bar` skill.
 */
export function findStatusBarCandidates() {
  const pointX = window.innerWidth / 2;
  const pointY = 4;

  return [...document.querySelectorAll("body *")]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const coversPoint =
        rect.left <= pointX &&
        pointX <= rect.right &&
        rect.top <= pointY &&
        pointY <= rect.bottom;
      if (!coversPoint) {
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

      const isWide = rect.width >= window.innerWidth * 0.9;
      const isTall = rect.height >= window.innerHeight * 0.9;
      if (!isWide && !isTall) {
        return false;
      }
      // WebKit skips a box taller than the viewport with no background, and a
      // viewport-sized box behind the page.
      if (rect.height >= window.innerHeight * 1.05 && isTransparent) {
        return false;
      }
      return !(isWide && isTall && Number(style.zIndex) < 0);
    })
    .map(
      (element) =>
        `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`,
    );
}
