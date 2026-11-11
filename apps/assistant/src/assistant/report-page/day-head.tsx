import * as stylex from "@stylexjs/stylex";
import type { SupportedLocale } from "@tuja/i18n/types";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlHeight, rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { ReportPastLink } from "./report-past-link.tsx";

/**
 * The top of a report and of the home page: a line with `controls`, the date
 * and `status`, then the title. The date's part of the line is as tall as a
 * control, with or without one, so the date and the title start at the same
 * place on every page of the reports. Where the list of reports does not show
 * beside, the way to it ends the line of `controls`, and the date and
 * `status` go on a line of their own.
 */
export function DayHead({
  date,
  dateIsTitle = false,
  locale,
  pastLink = false,
  status,
  note,
  controls,
  children,
}: {
  /** The day, as the page writes it. */
  date: string;
  /** Make the date the page's `<h1>`, where no title follows it. */
  dateIsTitle?: boolean;
  locale: SupportedLocale;
  /**
   * Whether to show the way to the list of reports, where the list does not
   * show beside. `narrow` is for a page without the list: see `ReportPastLink`.
   */
  pastLink?: boolean | "narrow";
  /** A quiet status at the end of the date's line. */
  status?: ReactNode;
  /** A line about the day under the date, such as that its report is late. */
  note?: ReactNode;
  /** At the start of the line, such as the switch between the views of the home page. */
  controls?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div css={stack.tight}>
      <div css={[flex.wrap, styles.line]}>
        {controls}
        {pastLink ? (
          <ReportPastLink locale={locale} narrowOnly={pastLink === "narrow"} />
        ) : null}
        <div css={[flex.wrap, styles.dateLine]}>
          {dateIsTitle ? (
            <h1 css={[typeRole.overline, styles.dateTitle]}>{date}</h1>
          ) : (
            <Text look="overline" tone="muted">
              {date}
            </Text>
          )}
          {status ? <div css={styles.end}>{status}</div> : null}
        </div>
      </div>
      {note}
      {children}
    </div>
  );
}

const styles = stylex.create({
  line: {
    columnGap: rhythm.item,
  },
  dateLine: {
    flexGrow: 1,
    minBlockSize: controlHeight.md,
  },
  dateTitle: {
    margin: 0,
    color: color.mutedForeground,
  },
  end: {
    marginInlineStart: "auto",
    paddingInlineStart: rhythm.item,
  },
});
