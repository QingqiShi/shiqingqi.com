"use client";

import * as stylex from "@stylexjs/stylex";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { cluster } from "../primitives/stack.stylex.ts";
import { splitViewTokens } from "../shells/navigation-split-view.stylex.ts";
import { tabViewTokens } from "../shells/tab-view.stylex.ts";
import { Divider } from "../surfaces/divider.tsx";
import { glassSurface } from "../surfaces/glass-surface.stylex.ts";
import { controlHeight, layer, space } from "../tokens.stylex.ts";
import { formFooterStyles } from "./form-footer.stylex.ts";
import type { FormFooterProps } from "./form-footer.tsx";

/**
 * The `sticky` form of `FormFooter`. The line of `divider` stays in the flow
 * above the pill: the pill is only as wide as its buttons, so it cannot draw
 * a line across the form.
 *
 * @internal
 */
export function StickyFormFooter({
  children,
  divider,
  css,
  ...rest
}: Omit<FormFooterProps, "sticky">) {
  const sticky = useEffectSticky();
  const { ref, isStuck, css: stickyCss } = sticky;

  return (
    <>
      {divider === true ? <Divider /> : null}
      <div
        {...rest}
        ref={ref}
        css={[
          cluster.tight,
          formFooterStyles.actions,
          styles.sticky,
          isStuck && glassSurface.base,
          css,
          stickyCss,
        ]}
      >
        <EffectCarrier value={sticky}>{children}</EffectCarrier>
      </div>
    </>
  );
}

const styles = stylex.create({
  // The pill is only as wide as its buttons, never a bar across the screen.
  // Thus iOS Safari does not take its fill as the colour of the band under
  // its toolbar. When the buttons do not fit on one line, the pill takes the
  // width of the column and the buttons wrap. It still floats clear of the
  // bottom edge, so it does not cover the point that Safari samples. The
  // padding stays when the pill goes, so the buttons do not move when it
  // sticks, and the negative margin lines them up with the content at rest.
  sticky: {
    position: "sticky",
    insetBlockEnd: `calc(${space._3} + max(${tabViewTokens.barClearance}, ${splitViewTokens.columnInsetBlockEnd}, env(safe-area-inset-bottom, 0px)))`,
    zIndex: layer.raised,
    // A pill of two lines keeps the corners of a pill of one line, so its
    // corners stay concentric with the buttons in them.
    borderRadius: `calc(${controlHeight.md} / 2 + ${space._0})`,
    cornerShape: "round",
    inlineSize: "fit-content",
    maxInlineSize: "100%",
    boxSizing: "border-box",
    marginInlineStart: "auto",
    marginInlineEnd: `calc(-1 * ${space._0})`,
    padding: space._0,
  },
});
