import * as stylex from "@stylexjs/stylex";
import { border, color, gradient } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";

export function GradientsShowcase() {
  return (
    <Showcase label={t({ en: "Gradients", zh: "渐变" })}>
      <ShowcaseGrid>
        <ShowcaseItem label="gradient.accent">
          <div css={[styles.swatch, styles.accent]} />
        </ShowcaseItem>
        <ShowcaseItem label="gradient.aurora">
          <div css={[styles.swatch, styles.aurora]} />
        </ShowcaseItem>
        <ShowcaseItem label="gradient.spotlight">
          <div css={[styles.swatch, styles.spotlight]} />
        </ShowcaseItem>
      </ShowcaseGrid>
    </Showcase>
  );
}

const styles = stylex.create({
  swatch: {
    inlineSize: "64px",
    blockSize: "64px",
    borderRadius: border.radius_2,
    border: `1px solid ${color.neutralBorder}`,
  },
  accent: {
    backgroundImage: gradient.accent,
    borderColor: "transparent",
  },
  aurora: {
    backgroundImage: gradient.aurora,
    borderColor: "transparent",
  },
  spotlight: {
    backgroundImage: gradient.spotlight,
    backgroundColor: color.background3,
  },
});
