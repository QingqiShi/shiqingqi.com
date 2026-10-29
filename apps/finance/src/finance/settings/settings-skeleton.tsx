"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  SETTINGS_GROUPS,
  type SettingsGroup,
  type SettingsSection,
} from "./settings-sections.ts";

const GROUP_LABEL_WIDTHS: Record<SettingsGroup, string> = {
  general: "4rem",
  organising: "5rem",
  automation: "5rem",
  device: "5.5rem",
};
const SECTION_WIDTHS: Record<SettingsSection, string> = {
  household: "5.5rem",
  members: "5.25rem",
  "exchange-rates": "7rem",
  groups: "3.75rem",
  categories: "5.5rem",
  payees: "4.25rem",
  tags: "3rem",
  rules: "6.75rem",
  ai: "5.5rem",
  connections: "6rem",
  preferences: "6.25rem",
  data: "2.75rem",
};
const FIELDS = 3;

/** `/settings` before it can show: the same title, groups of sections and open section, as blocks. */
export function SettingsSkeleton() {
  return (
    <div css={styles.root} aria-busy>
      <div css={stack.group}>
        <Heading level={1} look="h3" css={styles.title}>
          {t({ en: "Settings", zh: "设置" })}
        </Heading>
        <div css={stack.group}>
          {SETTINGS_GROUPS.map((group) => (
            <div key={group.id} css={stack.tight}>
              <div css={styles.groupLabel}>
                <Skeleton width={GROUP_LABEL_WIDTHS[group.id]} height=".7rem" />
              </div>
              <div css={styles.links}>
                {group.sections.map((section) => (
                  <div key={section} css={[row.tight, styles.link]}>
                    <SectionSkeleton section={section} />
                  </div>
                ))}
              </div>
              <div css={[cardSurface.base, listSurface.list, styles.rows]}>
                {group.sections.map((section) => (
                  <div key={section} css={[listSurface.item, listSurface.row]}>
                    <SectionSkeleton section={section} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div css={[stack.item, styles.content]}>
        <div css={stack.tight}>
          <Skeleton width="6rem" height="1.5rem" />
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

function SectionSkeleton({ section }: { section: SettingsSection }) {
  return (
    <>
      <Skeleton width="1rem" height="1rem" />
      <Skeleton width={SECTION_WIDTHS[section]} height="1rem" />
    </>
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
  groupLabel: {
    paddingInline: space._3,
  },
  links: {
    display: { default: "none", [breakpoints.lg]: "block" },
  },
  link: {
    blockSize: `calc(${font.uiBodySmall} * ${font.lineHeight_3} + 2 * ${space._1})`,
    paddingInline: space._3,
  },
  rows: {
    display: { default: "flex", [breakpoints.lg]: "none" },
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
