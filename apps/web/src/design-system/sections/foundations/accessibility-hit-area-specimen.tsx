import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Chip } from "@tuja/ui/components/chip";
import { border, color, rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/**
 * Small real controls, each with the area that takes a tap on a touch screen
 * drawn around it. The drawing uses the same inset as `a11y.touchTarget`, so
 * it shows the real area at every control size.
 */
export function AccessibilityHitAreaSpecimen() {
  return (
    <div css={styles.row}>
      <HitArea>
        <Chip size="xs">{t({ en: "Watchlist", zh: "待看清单" })}</Chip>
      </HitArea>
      <HitArea>
        <Button
          look="outline"
          size="sm"
          icon={<TrashIcon weight="bold" />}
          aria-label={t({ en: "Delete", zh: "删除" })}
        />
      </HitArea>
      <HitArea>
        <Button look="outline" size="sm">
          {t({ en: "Share", zh: "分享" })}
        </Button>
      </HitArea>
    </div>
  );
}

function HitArea({ children }: { children: ReactNode }) {
  return (
    <span css={styles.frame}>
      {children}
      <span css={styles.area} aria-hidden />
    </span>
  );
}

const styles = stylex.create({
  // The drawn areas reach past each control, so the gap leaves room for them.
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.group,
  },
  frame: {
    position: "relative",
    display: "inline-flex",
  },
  area: {
    position: "absolute",
    inset: "min(0px, calc(50% - 22px))",
    borderWidth: border.size_1,
    borderStyle: "dashed",
    borderColor: color.borderControl,
    pointerEvents: "none",
  },
});
