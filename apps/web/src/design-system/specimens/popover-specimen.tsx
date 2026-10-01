import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * The open state, which is the only state worth a tile — and which the real
 * `Popover` reaches by clicking and then portals to a viewport-fixed layer, so
 * an inert plate cannot host it. The trigger is the real `Button` and the panel
 * wears the component's own `popoverSurface` skin; only the placement is drawn.
 *
 * Lines of prose inside, not a stack of commands: the panel holding arbitrary
 * content is what separates this tile from Menu button's, which is otherwise
 * the same shape.
 */
export function PopoverSpecimen() {
  return (
    <div css={[specimenLayout.fill, styles.stage]}>
      <Button size="sm">{t({ en: "Details", zh: "详情" })}</Button>
      <div css={[popoverSurface.base, styles.panel]}>
        <WireframeBar width="52%" strong />
        <WireframeBar width="84%" />
      </div>
    </div>
  );
}

const styles = stylex.create({
  stage: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    // Reserves the panel's height, since the panel itself is out of flow, and
    // leaves the gap between the two that the component's `offset` would.
    minBlockSize: "4.75rem",
  },
  panel: {
    position: "absolute",
    insetBlockEnd: 0,
    // Held off the inline edges so the panel's own corners stay clear of the
    // tile's corner clip.
    insetInlineStart: space._1,
    insetInlineEnd: space._1,
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._1,
    paddingInline: space._2,
  },
});
