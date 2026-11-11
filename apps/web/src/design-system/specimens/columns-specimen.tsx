import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Two real cards shared two to one. Not the component itself: a tile is
 * narrower than the 44rem at which `Columns` sets its children side by side,
 * so the real one would show a single stack. The grid here has the same
 * tracks and gap as its `"2:1"` ratio.
 */
export function ColumnsSpecimen() {
  return (
    <div css={[specimenLayout.fill, styles.grid]}>
      <Card css={styles.card}>
        <Text look="caption">{t({ en: "Main", zh: "主列" })}</Text>
      </Card>
      <Card css={styles.card}>
        <Text look="caption">{t({ en: "Aside", zh: "侧栏" })}</Text>
      </Card>
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
    gap: rhythm.group,
  },
  card: {
    minBlockSize: "4rem",
    padding: space._3,
  },
});
