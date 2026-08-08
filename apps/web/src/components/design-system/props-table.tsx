"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Identifier } from "./identifier.tsx";

export interface PropsTableRow {
  /** Prop name, rendered monospace. */
  name: string;
  /** Type expression, rendered monospace. */
  type: string;
  /** Default value expression; omit for props without a default. */
  defaultValue?: string;
  /** Marks the prop as required with a Badge. */
  required?: boolean;
  /** Human description — already localised by the caller. */
  description: string;
}

interface PropsTableProps {
  rows: PropsTableRow[];
}

/**
 * Documents a component's props as a stack of cards rather than a rigid table:
 * each row pairs the monospace signature (name, type, default, required badge)
 * with its description, collapsing to a single column on narrow viewports.
 */
export function PropsTable({ rows }: PropsTableProps) {
  const requiredLabel = t({ en: "Required", zh: "必填" });
  const defaultLabel = t({ en: "Default", zh: "默认" });
  return (
    <section css={styles.section}>
      <Heading level={3}>{t({ en: "Props", zh: "属性" })}</Heading>
      <div css={styles.rows}>
        {rows.map((row) => (
          <div key={row.name} css={[corner.radius_2, styles.row]}>
            <div css={styles.signature}>
              <div css={styles.nameLine}>
                <span css={styles.name}>
                  <Identifier>{row.name}</Identifier>
                </span>
                {row.required ? (
                  <Badge variant="accent" size="small">
                    {requiredLabel}
                  </Badge>
                ) : null}
              </div>
              <span css={styles.type}>{row.type}</span>
              {row.defaultValue !== undefined ? (
                <span css={styles.defaultLine}>
                  <span css={styles.metaLabel}>{defaultLabel}</span>
                  <span css={styles.defaultValue}>{row.defaultValue}</span>
                </span>
              ) : null}
            </div>
            <Text variant="bodySmall" tone="muted" css={styles.description}>
              {row.description}
            </Text>
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  row: {
    display: "grid",
    // Signature column then description; stacks under one column on mobile.
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "minmax(11rem, 16rem) 1fr",
    },
    gap: { default: space._1, [breakpoints.md]: space._4 },
    paddingBlock: space._3,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  signature: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    minInlineSize: 0,
  },
  nameLine: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._1,
    minInlineSize: 0,
  },
  name: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMain,
  },
  // No `Identifier`: a type expression is not a name, and it already breaks at
  // its spaces, commas and pipes.
  type: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    overflowWrap: "break-word",
  },
  defaultLine: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: space._1,
    minInlineSize: 0,
  },
  metaLabel: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  defaultValue: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    overflowWrap: "break-word",
  },
  // `minInlineSize: 0` lets the grid track shrink, but a description carrying an
  // unbreakable run — a type expression quoted inline — still floors at its
  // min-content width and escapes the card, and every ancestor up to `<body>`
  // is `overflow: visible`, so the whole page ends up scrolling sideways.
  description: {
    minInlineSize: 0,
    overflowWrap: "break-word",
  },
});
