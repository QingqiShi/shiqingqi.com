import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { Identifier } from "#src/design-system/identifier.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

interface ReferenceRow {
  /** The row's name, in the row header cell. */
  name: string;
  cells: readonly ReactNode[];
  sample: ReactNode;
}

interface ReferenceTableProps {
  /** The column names, from the row header to the sample. */
  columns: readonly string[];
  rows: readonly ReferenceRow[];
  /** Shows each row name as a token Identifier rather than plain text. */
  identifierNames?: boolean;
}

function ReferenceTable({
  columns,
  rows,
  identifierNames = false,
}: ReferenceTableProps) {
  return (
    <div css={[corner.radius_2, styles.scroll]}>
      <table css={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" css={styles.head}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} css={styles.row}>
              <th
                scope="row"
                css={[
                  styles.cell,
                  styles.token,
                  !identifierNames && styles.nameCell,
                ]}
              >
                {identifierNames ? (
                  <Identifier>{row.name}</Identifier>
                ) : (
                  row.name
                )}
              </th>
              {row.cells.map((cell, index) => (
                <td key={index} css={[styles.cell, styles.mono]}>
                  {cell}
                </td>
              ))}
              <td css={[styles.cell, styles.sampleCell]}>{row.sample}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TokenRow {
  token: string;
  value: string;
  /** The component prop that sets this value, when one does. */
  setBy?: string;
  sample: ReactNode;
}

function TokenTable({
  title,
  rows,
}: {
  title: string;
  rows: readonly TokenRow[];
}) {
  return (
    <section css={stack.tight}>
      <Heading level={3}>{title}</Heading>
      <ReferenceTable
        identifierNames
        columns={[
          t({ en: "Token", zh: "令牌" }),
          t({ en: "Value", zh: "值" }),
          t({ en: "Set by", zh: "由谁设置" }),
          t({ en: "Sample", zh: "示例" }),
        ]}
        rows={rows.map(({ token, value, setBy, sample }) => ({
          name: token,
          cells: [value, setBy ?? "—"],
          sample,
        }))}
      />
    </section>
  );
}

function Lines({ lineHeight }: { lineHeight: StyleXStyles }) {
  return (
    <span css={[styles.lines, lineHeight]}>
      <span css={styles.line}>Kyoto</span>
      <span css={styles.line}>Nara</span>
    </span>
  );
}

/**
 * Weights, line heights and tracking as one compact reference: each token,
 * its value, the component prop that already sets it, and a sample.
 */
export function TypographyReferenceShowcase() {
  const weights: TokenRow[] = [
    { token: "font.weight_1", value: "100", sample: <W s={styles.w1} /> },
    { token: "font.weight_2", value: "200", sample: <W s={styles.w2} /> },
    { token: "font.weight_3", value: "300", sample: <W s={styles.w3} /> },
    {
      token: "font.weight_4",
      value: "400",
      setBy: 'weight="regular"',
      sample: <W s={styles.w4} />,
    },
    {
      token: "font.weight_5",
      value: "500",
      setBy: 'weight="medium"',
      sample: <W s={styles.w5} />,
    },
    {
      token: "font.weight_6",
      value: "600",
      setBy: 'weight="semibold"',
      sample: <W s={styles.w6} />,
    },
    {
      token: "font.weight_7",
      value: "700",
      setBy: 'weight="bold"',
      sample: <W s={styles.w7} />,
    },
    {
      token: "font.weight_8",
      value: "800",
      setBy: 'Heading weight="extrabold"',
      sample: <W s={styles.w8} />,
    },
    {
      token: "font.weight_9",
      value: "900",
      setBy: 'Heading weight="black"',
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
      setBy: 'Heading look="display"',
      sample: <Lines lineHeight={styles.lh1} />,
    },
    {
      token: "font.lineHeight_2",
      value: "1.2",
      setBy: 'Heading look="h1"…"h3"',
      sample: <Lines lineHeight={styles.lh2} />,
    },
    {
      token: "font.lineHeight_3",
      value: "1.3",
      setBy: 'Heading look="h4", Text look="caption" · "overline"',
      sample: <Lines lineHeight={styles.lh3} />,
    },
    {
      token: "font.lineHeight_4",
      value: "1.5",
      setBy: 'Text look="body" · "bodySmall"',
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
      setBy: 'Heading look="display"',
      sample: <Track s={styles.tight} />,
    },
    {
      token: "font.trackingSnug",
      value: "-0.01em",
      setBy: 'Heading look="h1"',
      sample: <Track s={styles.snug} />,
    },
    {
      token: "font.trackingNormal",
      value: "0",
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
      setBy: 'Text look="overline"',
      sample: <Track s={styles.widest} />,
    },
  ];

  return (
    <GuideSection
      title={t({
        en: "Weights, line heights and tracking",
        zh: "字重、行高与字距",
      })}
      lead={t({
        en: "Every value in the font group, for text you style yourself. Where a Text or Heading prop already sets a value, the table names it; on those components, use the prop rather than the token. The components widen tracking only on uppercase and tighten it only on their two largest sizes.",
        zh: "font 组中的所有值，供你自己设置文字样式时查阅。凡是 Text 或 Heading 的属性已经设置的值，表中都注明了；在这两个组件上，请用属性而不是令牌。组件只在大写文字上加宽字距，只在最大的两档字号上收紧字距。",
      })}
    >
      <div css={stack.group}>
        <TokenTable title={t({ en: "Weights", zh: "字重" })} rows={weights} />
        <TokenTable
          title={t({ en: "Line heights", zh: "行高" })}
          rows={lineHeights}
        />
        <TokenTable title={t({ en: "Tracking", zh: "字距" })} rows={tracking} />
      </div>
    </GuideSection>
  );
}

interface PairingRow {
  look: string;
  size: string;
  lineHeight: string;
  weight: string;
  tracking: string;
  sample: ReactNode;
}

/**
 * The size, line height, weight and tracking each Text and Heading look sets
 * together, so custom type can take a whole row instead of a lone size.
 */
export function TypographyPairingShowcase() {
  const inherited = t({ en: "inherited", zh: "继承" });
  const kyoto = t({ en: "Kyoto", zh: "京都" });
  const rows: PairingRow[] = [
    {
      look: 'Heading look="display"',
      size: "uiDisplay",
      lineHeight: "lineHeight_1",
      weight: "weight_8",
      tracking: "trackingTight",
      sample: <span css={styles.pairDisplay}>{kyoto}</span>,
    },
    {
      look: 'Heading look="h1"',
      size: "uiHeading1",
      lineHeight: "lineHeight_2",
      weight: "weight_8",
      tracking: "trackingSnug",
      sample: <span css={styles.pairH1}>{kyoto}</span>,
    },
    {
      look: 'Heading look="h2"',
      size: "uiHeading2",
      lineHeight: "lineHeight_2",
      weight: "weight_7",
      tracking: "—",
      sample: <span css={styles.pairH2}>{kyoto}</span>,
    },
    {
      look: 'Heading look="h3"',
      size: "uiHeading3",
      lineHeight: "lineHeight_2",
      weight: "weight_7",
      tracking: "—",
      sample: <span css={styles.pairH3}>{kyoto}</span>,
    },
    {
      look: 'Heading look="h4"',
      size: "uiBody",
      lineHeight: "lineHeight_3",
      weight: "weight_7",
      tracking: "—",
      sample: <span css={styles.pairH4}>{kyoto}</span>,
    },
    {
      look: 'Text look="body"',
      size: "uiBody",
      lineHeight: "lineHeight_4",
      weight: inherited,
      tracking: "—",
      sample: (
        <Text as="span" look="body">
          {kyoto}
        </Text>
      ),
    },
    {
      look: 'Text look="bodySmall"',
      size: "uiBodySmall",
      lineHeight: "lineHeight_4",
      weight: inherited,
      tracking: "—",
      sample: (
        <Text as="span" look="bodySmall">
          {kyoto}
        </Text>
      ),
    },
    {
      look: 'Text look="caption"',
      size: "uiCaption",
      lineHeight: "lineHeight_3",
      weight: inherited,
      tracking: "—",
      sample: (
        <Text as="span" look="caption">
          {kyoto}
        </Text>
      ),
    },
    {
      look: 'Text look="overline"',
      size: "uiOverline",
      lineHeight: "lineHeight_3",
      weight: "weight_6",
      tracking: "trackingWidest",
      sample: (
        <Text as="span" look="overline">
          {kyoto}
        </Text>
      ),
    },
  ];
  return (
    <GuideSection
      title={t({
        en: "Pair a size the way the components do",
        zh: "像组件那样搭配字号",
      })}
      lead={t({
        en: "Each look of Text and Heading sets a size together with a line height, and a heading also sets a weight and, at the two largest sizes, tighter tracking. When you set a size yourself, take the rest of its row, so your type sits in line with theirs. The overline also sets uppercase.",
        zh: "Text 与 Heading 的每个 look 都会把字号与行高一起设定；标题还会设定字重，最大的两档还会收紧字距。自己设定字号时，请把同一行的其余值一并带上，使你的文字与组件的文字保持一致。overline 还会设定大写。",
      })}
    >
      <ReferenceTable
        columns={[
          t({ en: "Look", zh: "Look" }),
          t({ en: "Size", zh: "字号" }),
          t({ en: "Line height", zh: "行高" }),
          t({ en: "Weight", zh: "字重" }),
          t({ en: "Tracking", zh: "字距" }),
          t({ en: "Sample", zh: "示例" }),
        ]}
        rows={rows.map(
          ({ look, size, lineHeight, weight, tracking, sample }) => ({
            name: look,
            cells: [size, lineHeight, weight, tracking],
            sample,
          }),
        )}
      />
      <UsageSnippet
        code={`import * as stylex from "@stylexjs/stylex";
import { font } from "@tuja/ui/tokens.stylex";

// The h1 row, on an element Heading cannot render.
const styles = stylex.create({
  posterTitle: {
    fontSize: font.uiHeading1,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingSnug,
  },
});`}
      />
    </GuideSection>
  );
}

function W({ s }: { s: StyleXStyles }) {
  return <span css={[styles.weightSample, s]}>Ag</span>;
}

function Track({ s }: { s: StyleXStyles }) {
  return <span css={[styles.trackSample, s]}>Kyoto</span>;
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
    fontSize: font.uiCaption,
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
    fontSize: font.uiCaption,
    fontWeight: font.weight_4,
    color: color.fg,
  },
  nameCell: {
    whiteSpace: "normal",
  },
  mono: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.fgMuted,
    fontVariantNumeric: "tabular-nums",
  },
  sampleCell: {
    color: color.fg,
  },
  weightSample: {
    fontSize: font.uiHeading2,
    lineHeight: font.lineHeight_1,
  },
  pairDisplay: {
    fontSize: font.uiDisplay,
    lineHeight: font.lineHeight_1,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
  },
  pairH1: {
    fontSize: font.uiHeading1,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingSnug,
  },
  pairH2: {
    fontSize: font.uiHeading2,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_7,
  },
  pairH3: {
    fontSize: font.uiHeading3,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_7,
  },
  pairH4: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_7,
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
    fontSize: font.uiBodySmall,
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
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
  },
  tight: { letterSpacing: font.trackingTight },
  snug: { letterSpacing: font.trackingSnug },
  normal: { letterSpacing: font.trackingNormal },
  wide: { letterSpacing: font.trackingWide },
  wider: { letterSpacing: font.trackingWider, textTransform: "uppercase" },
  widest: { letterSpacing: font.trackingWidest, textTransform: "uppercase" },
});
