import * as stylex from "@stylexjs/stylex";
import { border, color, shadow } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";

export function ShadowsShowcase() {
  return (
    <Showcase label={t({ en: "Shadows", zh: "阴影" })}>
      <ShowcaseGrid>
        <ShowcaseItem label="shadow._1">
          <div css={[styles.block, styles.shadow1]} />
        </ShowcaseItem>
        <ShowcaseItem label="shadow._2">
          <div css={[styles.block, styles.shadow2]} />
        </ShowcaseItem>
        <ShowcaseItem label="shadow._3">
          <div css={[styles.block, styles.shadow3]} />
        </ShowcaseItem>
        <ShowcaseItem label="shadow._4">
          <div css={[styles.block, styles.shadow4]} />
        </ShowcaseItem>
        <ShowcaseItem label="shadow._5">
          <div css={[styles.block, styles.shadow5]} />
        </ShowcaseItem>
        <ShowcaseItem label="shadow.glowAccentSoft">
          <div css={[styles.block, styles.glowSoft]} />
        </ShowcaseItem>
        <ShowcaseItem label="shadow.glowAccent">
          <div css={[styles.block, styles.glow]} />
        </ShowcaseItem>
      </ShowcaseGrid>
    </Showcase>
  );
}

const styles = stylex.create({
  block: {
    inlineSize: "80px",
    blockSize: "80px",
    borderRadius: border.radius_2,
    backgroundColor: color.background3,
    border: `1px solid ${color.neutralBorder}`,
  },
  shadow1: { boxShadow: shadow._1 },
  shadow2: { boxShadow: shadow._2 },
  shadow3: { boxShadow: shadow._3 },
  shadow4: { boxShadow: shadow._4 },
  shadow5: { boxShadow: shadow._5 },
  glowSoft: { boxShadow: shadow.glowAccentSoft },
  glow: { boxShadow: shadow.glowAccent },
});
