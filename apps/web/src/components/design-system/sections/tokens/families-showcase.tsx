import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";

export function FamiliesShowcase() {
  return (
    <Showcase label={t({ en: "Families", zh: "字体族" })}>
      <div css={styles.grid}>
        <div css={styles.card}>
          <header css={styles.header}>
            <span css={styles.token}>font.family</span>
            <span css={styles.value}>Inter, sans-serif</span>
          </header>
          <div css={[styles.specimen, styles.sans]}>Aa</div>
          <div css={[styles.charset, styles.sans]}>
            <p css={styles.charsetLine}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            <p css={styles.charsetLine}>abcdefghijklmnopqrstuvwxyz</p>
            <p css={styles.charsetLine}>0123456789 — &amp; ?!“”</p>
          </div>
        </div>
        <div css={styles.card}>
          <header css={styles.header}>
            <span css={styles.token}>font.familyMono</span>
            <span css={styles.value}>ui-monospace, SF Mono, Menlo</span>
          </header>
          <div css={[styles.specimen, styles.mono]}>Aa</div>
          <div css={[styles.charset, styles.mono]}>
            <p css={styles.charsetLine}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            <p css={styles.charsetLine}>abcdefghijklmnopqrstuvwxyz</p>
            <p css={styles.charsetLine}>{"0123456789 — & ?! {}"}</p>
          </div>
        </div>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: space._3,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    paddingBlock: space._4,
    paddingInline: space._4,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  value: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    overflowWrap: "anywhere",
  },
  specimen: {
    fontSize: {
      default: "5rem",
      [breakpoints.md]: "6rem",
    },
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_0,
    letterSpacing: font.trackingTight,
    color: color.textMain,
    marginBlock: space._1,
  },
  charset: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_3,
    overflowWrap: "anywhere",
  },
  charsetLine: {
    margin: 0,
  },
  sans: { fontFamily: font.family },
  mono: { fontFamily: font.familyMono },
});
