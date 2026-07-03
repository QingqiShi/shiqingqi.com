import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { Fragment } from "react";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

interface Band {
  label: string;
  note: string;
}

interface SpaceStep {
  member: string;
  rem: string;
  px: string;
  bar: StyleXStyles;
  /** Present on the first step of a regime — renders a banded sub-heading. */
  band?: Band;
}

export function SpaceScaleShowcase() {
  const interior: Band = {
    label: t({ en: "Interior", zh: "组件内部" }),
    note: t({ en: "space inside a component", zh: "组件内部的空间" }),
  };
  const layout: Band = {
    label: t({ en: "Layout", zh: "布局" }),
    note: t({ en: "rhythm between regions", zh: "区域之间的节奏" }),
  };

  // Each bar renders at the token's true size (`inlineSize: space._N`), so the
  // ruler stays honest — and author-mode edits move the bar live. Every row is
  // an editable specimen keyed on its space token. The scale splits in two at
  // 2rem: fine, near-even steps for component interiors, then coarser jumps for
  // layout — the `band` marks each regime's first step.
  const steps: SpaceStep[] = [
    {
      member: "_00",
      rem: "0.1rem",
      px: "1.6px",
      bar: styles.w00,
      band: interior,
    },
    { member: "_0", rem: "0.25rem", px: "4px", bar: styles.w0 },
    { member: "_1", rem: "0.5rem", px: "8px", bar: styles.w1 },
    { member: "_2", rem: "0.75rem", px: "12px", bar: styles.w2 },
    { member: "_3", rem: "1rem", px: "16px", bar: styles.w3 },
    { member: "_4", rem: "1.25rem", px: "20px", bar: styles.w4 },
    { member: "_5", rem: "1.5rem", px: "24px", bar: styles.w5 },
    { member: "_6", rem: "1.75rem", px: "28px", bar: styles.w6 },
    { member: "_7", rem: "2rem", px: "32px", bar: styles.w7 },
    { member: "_8", rem: "3rem", px: "48px", bar: styles.w8, band: layout },
    { member: "_9", rem: "4rem", px: "64px", bar: styles.w9 },
    { member: "_10", rem: "5rem", px: "80px", bar: styles.w10 },
    { member: "_11", rem: "7.5rem", px: "120px", bar: styles.w11 },
    { member: "_12", rem: "10rem", px: "160px", bar: styles.w12 },
    { member: "_13", rem: "15rem", px: "240px", bar: styles.w13 },
    { member: "_14", rem: "20rem", px: "320px", bar: styles.w14 },
    { member: "_15", rem: "30rem", px: "480px", bar: styles.w15 },
    { member: "_16", rem: "35rem", px: "560px", bar: styles.w16 },
  ];

  return (
    <Showcase label={t({ en: "Scale", zh: "阶梯" })}>
      <ShowcaseHelper>
        {t({
          en: "Eighteen steps on a rem base, measured from a common baseline. Fine, near-even increments up to 2rem size a component's interior; the coarser jumps beyond set the rhythm between whole layout regions.",
          zh: "以 rem 为基准的十八个步长，从同一基线量起。2rem 以内为细密而近乎均匀的增量，用于组件内部；其上的粗跳跃则设定整块布局区域之间的节奏。",
        })}
      </ShowcaseHelper>
      <div css={styles.scroller}>
        <ol css={styles.ledger}>
          {steps.map((step) => (
            <Fragment key={step.member}>
              {step.band ? (
                <li css={styles.band}>
                  <span css={styles.bandInner}>
                    <span css={styles.bandLabel}>{step.band.label}</span>
                    <span css={styles.bandNote}>{step.band.note}</span>
                  </span>
                </li>
              ) : null}
              <li css={styles.row} data-author-token={`space.${step.member}`}>
                <div css={styles.meta}>
                  <span css={styles.token}>{`space.${step.member}`}</span>
                  <span css={styles.value}>
                    <span css={styles.rem}>{step.rem}</span>
                    <span css={styles.dot}>·</span>
                    <span css={styles.px}>{step.px}</span>
                  </span>
                </div>
                <span css={[styles.bar, step.bar]} />
              </li>
            </Fragment>
          ))}
        </ol>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  // The largest steps (up to 35rem) outrun the column on narrow viewports, so
  // the scroll lives on this wrapper while the ledger sizes to its content.
  scroller: {
    overflowX: "auto",
    overscrollBehaviorX: "contain",
    minInlineSize: 0,
  },
  ledger: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    // Width tracks the widest row so every row stretches to the full scroll
    // width — that gives the sticky meta a containing block it can travel across.
    // `min-inline-size: 100%` keeps the ledger filling the lane when it all fits.
    inlineSize: "max-content",
    minInlineSize: "100%",
  },
  band: {
    display: "flex",
    // A hairline rule + label separating the interior steps from the layout
    // steps. The first band drops the rule and the leading space.
    marginBlockStart: { default: space._3, ":first-child": 0 },
    paddingBlockStart: { default: space._3, ":first-child": 0 },
    borderBlockStartWidth: { default: "1px", ":first-child": 0 },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
  bandInner: {
    display: "flex",
    alignItems: "baseline",
    gap: space._2,
    // Pinned like the row meta so the regime label survives the scroll.
    position: "sticky",
    insetInlineStart: 0,
    backgroundColor: color.bgSurface,
    paddingInlineEnd: space._3,
  },
  bandLabel: {
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWidest,
    textTransform: "uppercase",
    color: color.textMuted,
    whiteSpace: "nowrap",
  },
  bandNote: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
    whiteSpace: "nowrap",
  },
  // A flex row (not grid): the meta's containing block is the whole row, so its
  // `position: sticky` can travel the full scroll distance. In a grid the meta
  // is confined to its narrow cell and slides off with the row.
  row: {
    display: "flex",
    alignItems: "center",
  },
  meta: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    // Fixed width, never shrinks — the token labels stay legible and the bars
    // all start from the same baseline.
    inlineSize: "9rem",
    flexShrink: 0,
    boxSizing: "border-box",
    // Pinned to the ledger's leading edge so the token label survives the
    // horizontal scroll the widest bars force; the opaque surface masks bars
    // sliding underneath and the hairline is the ruler's zero line.
    position: "sticky",
    insetInlineStart: 0,
    zIndex: 1,
    backgroundColor: color.bgSurface,
    paddingInlineEnd: space._4,
    borderInlineEndWidth: "1px",
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.neutralBorder,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    whiteSpace: "nowrap",
  },
  value: {
    display: "flex",
    alignItems: "baseline",
    gap: space._1,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  rem: { color: color.textMain },
  dot: { color: color.textSubtle },
  px: { color: color.textSubtle },
  // A crisp dark tick sitting on the zero line — reads as a measured length on a
  // ruler, not the loud accent fill (too heavy across 18 rows) nor a pale bar on
  // a track (which reads as a skeleton loader). The other foundations are
  // restrained; the accent is spent on the "In use" surfaces below instead.
  bar: {
    blockSize: space._2,
    // Keep the token's true width — never let flexbox compress it to fit.
    flexShrink: 0,
    borderRadius: "2px",
    backgroundColor: color.neutralText,
  },
  w00: { inlineSize: space._00 },
  w0: { inlineSize: space._0 },
  w1: { inlineSize: space._1 },
  w2: { inlineSize: space._2 },
  w3: { inlineSize: space._3 },
  w4: { inlineSize: space._4 },
  w5: { inlineSize: space._5 },
  w6: { inlineSize: space._6 },
  w7: { inlineSize: space._7 },
  w8: { inlineSize: space._8 },
  w9: { inlineSize: space._9 },
  w10: { inlineSize: space._10 },
  w11: { inlineSize: space._11 },
  w12: { inlineSize: space._12 },
  w13: { inlineSize: space._13 },
  w14: { inlineSize: space._14 },
  w15: { inlineSize: space._15 },
  w16: { inlineSize: space._16 },
});
