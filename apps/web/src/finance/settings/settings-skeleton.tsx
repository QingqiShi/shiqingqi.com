"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

const SECTION_WIDTHS = [
  "5.5rem",
  "7rem",
  "5.25rem",
  "3.75rem",
  "5.5rem",
  "4.25rem",
  "3rem",
  "6.75rem",
  "5.5rem",
  "6rem",
  "2.75rem",
  "6.25rem",
];
const FIELDS = 3;

/** `/finance/settings` before it can show: the same title, menu of sections and open section, as blocks. */
export function SettingsSkeleton() {
  return (
    <div css={styles.root} aria-busy>
      <div css={stack.item}>
        <Heading level={1} look="h3" css={styles.title}>
          {t({ en: "Settings", zh: "设置" })}
        </Heading>
        <div css={styles.menu}>
          {SECTION_WIDTHS.map((width, index) => (
            <div key={index} css={styles.section}>
              <Skeleton width={width} height="1rem" />
            </div>
          ))}
        </div>
      </div>
      <div css={[stack.item, styles.content]}>
        <div css={stack.tight}>
          <Skeleton width="6rem" height="1.3rem" />
          <Skeleton width="70%" height="1.25rem" />
        </div>
        {Array.from({ length: FIELDS }, (_, index) => (
          <div key={index} css={stack.tight}>
            <Skeleton width="7rem" height="1.25rem" />
            <Skeleton width="100%" css={styles.field} />
          </div>
        ))}
        <Skeleton width="4rem" css={styles.button} />
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "12rem minmax(0, 1fr)",
    },
    gap: rhythm.section,
    alignItems: "start",
  },
  title: {
    margin: 0,
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  section: {
    display: "flex",
    alignItems: "center",
    blockSize: {
      default: `calc(${font.uiBodySmall} * ${font.lineHeight_3} + 2 * ${space._2})`,
      [breakpoints.lg]: `calc(${font.uiBodySmall} * ${font.lineHeight_3} + 2 * ${space._1})`,
    },
    paddingInline: space._2,
  },
  content: {
    display: { default: "none", [breakpoints.lg]: "flex" },
    minInlineSize: 0,
    maxInlineSize: "32rem",
  },
  field: {
    height: controlHeight.md,
  },
  button: {
    height: controlHeight.md,
  },
});
