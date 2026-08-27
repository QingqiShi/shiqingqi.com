import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * The expanded state, which is what distinguishes this from a plain Button —
 * and which the real `MenuButton` only reaches on click, so it cannot be shown
 * by an inert specimen. The trigger and the items are the real `Button`; only
 * the popup surface is composed here, from the same `popoverSurface` skin the
 * component's own popup wears. No Progressive blur: the real popup blurs the
 * page around it, and on an empty plate there is nothing for it to blur.
 *
 * No section label inside the popup: two items already read as a menu, and a
 * label would be a third type size in a tile that only needs to show a shape.
 */
export function MenuButtonSpecimen() {
  return (
    <div css={[specimenLayout.fill, styles.stage]}>
      <Button size="sm" icon={<FunnelIcon weight="bold" />}>
        {t({ en: "Filters", zh: "筛选" })}
      </Button>
      <div css={[popoverSurface.base, styles.popup]}>
        <Button size="sm" variant="primary">
          {t({ en: "Newest", zh: "最新" })}
        </Button>
        <Button size="sm">{t({ en: "Popular", zh: "热门" })}</Button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  stage: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    // Reserves the popup's height, since the popup itself is out of flow. Kept
    // as tight as the popup allows: this is the tallest specimen in its grid
    // row, so every extra pixel here opens a gap under its neighbours' copy.
    minBlockSize: "4.75rem",
  },
  popup: {
    position: "absolute",
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    display: "flex",
    flexDirection: "column",
    minInlineSize: "8rem",
    padding: space._0,
  },
});
