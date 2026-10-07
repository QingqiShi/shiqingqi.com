import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Spinner } from "@tuja/ui/components/spinner";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { HeldLoop } from "./held-loop.tsx";

/** A Spinner and a Skeleton, both held by one declaration on their ancestor. */
export function MotionHoldBackSpecimen() {
  return (
    <HeldLoop>
      <div css={[flex.row, corner.radius_2, styles.holdTile]}>
        <Spinner size="sm" aria-hidden />
        <div css={stack.tight}>
          <span>{t({ en: "Syncing 3 lists", zh: "正在同步 3 个清单" })}</span>
          <Skeleton width="8rem" height="0.5rem" />
        </div>
      </div>
    </HeldLoop>
  );
}

const styles = stylex.create({
  holdTile: {
    gap: rhythm.tight,
    paddingBlock: space._3,
    paddingInline: space._3,
    fontSize: font.uiBodySmall,
    color: color.fg,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
});
