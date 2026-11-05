import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { color, layer, shadow, space } from "@tuja/ui/tokens.stylex";
import { DESIGN_SYSTEM_CONTENT_ID } from "#src/design-system/design-system-content-id.ts";

/**
 * Bypass block (WCAG 2.4.1) for the design-system shell. The sidebar
 * lists every route in the showcase, so without this a keyboard visitor tabs
 * past ~30 links before reaching the page they asked for.
 *
 * Built as a `Button`, so the revealed link inherits the outline look and its
 * focus ring rather than restating either. All this component adds is where it
 * parks, and the fill that an outline does not have, because it floats over the
 * page.
 *
 * Local to `apps/web`: the site's other shell puts three controls before its
 * content, not thirty, so there is no second consumer to design for yet.
 */
export function SkipToContent() {
  return (
    <Button
      size="sm"
      look="outline"
      href={`#${DESIGN_SYSTEM_CONTENT_ID}`}
      css={styles.link}
    >
      {t({ en: "Skip to content", zh: "跳到主要内容" })}
    </Button>
  );
}

const styles = stylex.create({
  link: {
    position: "fixed",
    // Parked above the fold until focused, plus `space._8` of clearance so the
    // shadow cast below the pill stays off-screen too. Pinning the block-end
    // edge to the viewport's block-start is what makes the hiding
    // height-independent — `inset` percentages resolve against the containing
    // block, so no percentage of the pill's own height is involved and it clears
    // the edge whatever the label wraps to.
    insetBlockEnd: { default: `calc(100% + ${space._8})`, ":focus": "auto" },
    insetBlockStart: {
      default: "auto",
      ":focus": `calc(${space._2} + env(safe-area-inset-top))`,
    },
    insetInlineStart: pageGutter.inlineStart,
    // Above the menu button (`layer.header`) and the drawer (`layer.overlay`),
    // because a revealed skip link must never be under the chrome.
    zIndex: layer.toaster,
    // Lifts the link off what it covers. The outline alone reads as in-flow
    // chrome rather than as an overlay.
    backgroundColor: color.bgSurface,
    boxShadow: shadow._4,
  },
});
