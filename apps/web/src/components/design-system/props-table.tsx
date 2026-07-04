"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

export interface PropsTableRow {
  /** Prop name, rendered monospace. */
  name: string;
  /** Type expression, rendered monospace. */
  type: string;
  /** Default value expression; omit for props without a default. */
  defaultValue?: string;
  /** Marks the prop as required with a Badge. */
  required?: boolean;
  /** Human description — already localized by the caller. */
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
          <div key={row.name} css={styles.row}>
            <div css={styles.signature}>
              <div css={styles.nameLine}>
                <span css={styles.name}>{row.name}</span>
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
    borderRadius: border.radius_2,
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
    overflowWrap: "anywhere",
  },
  type: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    overflowWrap: "anywhere",
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
    overflowWrap: "anywhere",
  },
  description: {
    minInlineSize: 0,
  },
});
