import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { t } from "#src/i18n.ts";

interface TokenRow {
  token: string;
  value: string;
  /** What already uses this token: a component prop, or the type roles. */
  usedBy?: string;
  sample: ReactNode;
}

interface TokenTableProps {
  title: string;
  /** The name of the column that says what already uses each token. */
  usedByColumn: string;
  rows: readonly TokenRow[];
}

function TokenTable({ title, usedByColumn, rows }: TokenTableProps) {
  const columns = [
    t({ en: "Token", zh: "令牌" }),
    t({ en: "Value", zh: "值" }),
    usedByColumn,
    t({ en: "Sample", zh: "示例" }),
  ];
  return (
    <section css={stack.tight}>
      <Heading level={3}>{title}</Heading>
      <div css={[corner.radius_2, a11y.focusRing, styles.scroll]}>
        <table css={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  css={[typeRole.caption, styles.head]}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.token} css={styles.row}>
                <th
                  scope="row"
                  css={[typeRole.caption, styles.cell, styles.token]}
                >
                  {row.token}
                </th>
                {[row.value, row.usedBy ?? "—"].map((cell, index) => (
                  <td
                    key={index}
                    css={[
                      typeRole.caption,
                      typeModifier.numeric,
                      styles.cell,
                      styles.mono,
                      index === 1 && styles.usedBy,
                    ]}
                  >
                    {cell}
                  </td>
                ))}
                <td css={[styles.cell, styles.sampleCell]}>{row.sample}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Lines({ lineHeight }: { lineHeight: StyleXStyles }) {
  return (
    <span css={[typeRole.bodySmall, styles.lines, lineHeight]}>
      <span css={styles.line}>Kyoto</span>
      <span css={styles.line}>Nara</span>
    </span>
  );
}

function W({ s }: { s: StyleXStyles }) {
  return <span css={[typeRole.h2, styles.weightSample, s]}>Ag</span>;
}

function Track({ s }: { s: StyleXStyles }) {
  return <span css={[typeRole.body, styles.trackSample, s]}>Kyoto</span>;
}

/**
 * The weight, line height and tracking tokens: what a style may change on top
 * of a type role, and which type roles already use each one.
 */
export function TypographyReferenceShowcase() {
  const weights: TokenRow[] = [
    { token: "font.weight_1", value: "100", sample: <W s={styles.w1} /> },
    { token: "font.weight_2", value: "200", sample: <W s={styles.w2} /> },
    { token: "font.weight_3", value: "300", sample: <W s={styles.w3} /> },
    {
      token: "font.weight_4",
      value: "400",
      usedBy: 'weight="regular"',
      sample: <W s={styles.w4} />,
    },
    {
      token: "font.weight_5",
      value: "500",
      usedBy: 'weight="medium"',
      sample: <W s={styles.w5} />,
    },
    {
      token: "font.weight_6",
      value: "600",
      usedBy: 'weight="semibold"',
      sample: <W s={styles.w6} />,
    },
    {
      token: "font.weight_7",
      value: "700",
      usedBy: 'weight="bold"',
      sample: <W s={styles.w7} />,
    },
    {
      token: "font.weight_8",
      value: "800",
      usedBy: 'Heading weight="extrabold"',
      sample: <W s={styles.w8} />,
    },
    {
      token: "font.weight_9",
      value: "900",
      usedBy: 'Heading weight="black"',
      sample: <W s={styles.w9} />,
    },
  ];

  const lineHeights: TokenRow[] = [
    {
      token: "font.lineHeight_00",
      value: "0.95",
      sample: <Lines lineHeight={styles.lh00} />,
    },
    {
      token: "font.lineHeight_0",
      value: "1",
      sample: <Lines lineHeight={styles.lh0} />,
    },
    {
      token: "font.lineHeight_1",
      value: "1.1",
      usedBy: "display, subDisplay, fluidDisplay",
      sample: <Lines lineHeight={styles.lh1} />,
    },
    {
      token: "font.lineHeight_2",
      value: "1.2",
      usedBy: "h1–h3, fluidH1, fluidH2, cardTitle",
      sample: <Lines lineHeight={styles.lh2} />,
    },
    {
      token: "font.lineHeight_3",
      value: "1.3",
      usedBy: "h4, label, caption, overline, control, controlCaption, fluidH3",
      sample: <Lines lineHeight={styles.lh3} />,
    },
    {
      token: "font.lineHeight_4",
      value: "1.5",
      usedBy: "body, bodySmall, fluidLead",
      sample: <Lines lineHeight={styles.lh4} />,
    },
    {
      token: "font.lineHeight_5",
      value: "2",
      sample: <Lines lineHeight={styles.lh5} />,
    },
  ];

  const tracking: TokenRow[] = [
    {
      token: "font.trackingTight",
      value: "-0.025em",
      usedBy: "display, subDisplay, fluidDisplay",
      sample: <Track s={styles.tight} />,
    },
    {
      token: "font.trackingSnug",
      value: "-0.01em",
      usedBy: "h1",
      sample: <Track s={styles.snug} />,
    },
    {
      token: "font.trackingNormal",
      value: "0",
      usedBy: t({ en: "every other type role", zh: "其余所有字体角色" }),
      sample: <Track s={styles.normal} />,
    },
    {
      token: "font.trackingWide",
      value: "0.025em",
      sample: <Track s={styles.wide} />,
    },
    {
      token: "font.trackingWider",
      value: "0.05em",
      sample: <Track s={styles.wider} />,
    },
    {
      token: "font.trackingWidest",
      value: "0.12em",
      usedBy: "overline",
      sample: <Track s={styles.widest} />,
    },
  ];

  const prop = t({ en: "Prop", zh: "属性" });
  const typeRoles = t({ en: "Type roles", zh: "字体角色" });

  return (
    <GuideSection
      title={t({
        en: "Change the weight, and little else",
        zh: "只改字重，其余不动",
      })}
      lead={t({
        en: "A type role already pairs its size with a line height, a weight and a tracking, so you never pair them yourself. On top of a type role, your style may change the weight with a font.weight_* token, and the line height only as a layout trick, such as lineHeight_0 on a one-line number in a tight box. The tables list each token and what already uses it.",
        zh: "字体角色已经把字号与行高、字重、字距配好，因此你无需自己搭配。在字体角色之上，你的样式可以用 font.weight_* 令牌改字重；行高只在布局需要时才改，例如在紧凑的框里给单行数字用 lineHeight_0。下表列出每个令牌，以及已经用到它的地方。",
      })}
    >
      <div css={stack.group}>
        <TokenTable
          title={t({ en: "Weights", zh: "字重" })}
          usedByColumn={prop}
          rows={weights}
        />
        <TokenTable
          title={t({ en: "Line heights", zh: "行高" })}
          usedByColumn={typeRoles}
          rows={lineHeights}
        />
        <TokenTable
          title={t({ en: "Tracking", zh: "字距" })}
          usedByColumn={typeRoles}
          rows={tracking}
        />
      </div>
      <GuideNote>
        {t({
          en: "The @tuja/require-type-role lint rule holds this. It reports a fontSize outside a type role, a fontVariantNumeric set by hand, and a raw value for the weight, line height, tracking or family. A fontSize of inherit is allowed, and so is a controlSize token that sizes a glyph inside a control.",
          zh: "@tuja/require-type-role 检查规则负责落实这一点。它会报告字体角色之外的 fontSize、手动设置的 fontVariantNumeric，以及字重、行高、字距或字体族的原始值。fontSize 设为 inherit 是允许的，用 controlSize 令牌为控件里的字形设定尺寸也是允许的。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

const styles = stylex.create({
  // A table wider than the column scrolls inside its own surface.
  scroll: {
    overflowX: "auto",
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  table: {
    inlineSize: "100%",
    borderCollapse: "collapse",
  },
  head: {
    paddingBlock: space._1,
    paddingInline: space._3,
    textAlign: "start",
    fontWeight: font.weight_6,
    color: color.fgMuted,
    whiteSpace: "nowrap",
  },
  row: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  cell: {
    paddingBlock: space._1,
    paddingInline: space._3,
    textAlign: "start",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  token: {
    fontFamily: font.familyMono,
    color: color.fg,
  },
  mono: {
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  usedBy: {
    minInlineSize: "12rem",
    whiteSpace: "normal",
  },
  sampleCell: {
    color: color.fg,
  },
  weightSample: {
    lineHeight: font.lineHeight_1,
  },
  w1: { fontWeight: font.weight_1 },
  w2: { fontWeight: font.weight_2 },
  w3: { fontWeight: font.weight_3 },
  w4: { fontWeight: font.weight_4 },
  w5: { fontWeight: font.weight_5 },
  w6: { fontWeight: font.weight_6 },
  w7: { fontWeight: font.weight_7 },
  w8: { fontWeight: font.weight_8 },
  w9: { fontWeight: font.weight_9 },
  lines: {
    display: "block",
  },
  line: {
    display: "block",
  },
  lh00: { lineHeight: font.lineHeight_00 },
  lh0: { lineHeight: font.lineHeight_0 },
  lh1: { lineHeight: font.lineHeight_1 },
  lh2: { lineHeight: font.lineHeight_2 },
  lh3: { lineHeight: font.lineHeight_3 },
  lh4: { lineHeight: font.lineHeight_4 },
  lh5: { lineHeight: font.lineHeight_5 },
  trackSample: {
    fontWeight: font.weight_6,
  },
  tight: { letterSpacing: font.trackingTight },
  snug: { letterSpacing: font.trackingSnug },
  normal: { letterSpacing: font.trackingNormal },
  wide: { letterSpacing: font.trackingWide },
  wider: { letterSpacing: font.trackingWider, textTransform: "uppercase" },
  widest: { letterSpacing: font.trackingWidest, textTransform: "uppercase" },
});
