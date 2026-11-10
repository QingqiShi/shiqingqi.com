"use client";

import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Button } from "@tuja/ui/components/button";
import {
  SplitViewLink,
  StackedOnly,
} from "@tuja/ui/components/navigation-split-view";

// Where the reports' split view stacks: below 48rem of view, which leaves
// about 45rem for the content inside the island's inset and padding.
const NARROW = "@container (width < 45rem)";

/**
 * The way to the list of reports, at the end of a line, only where the list
 * does not show beside the report. What follows it in the line starts a new
 * line. With `narrowOnly`, for a page that never shows the list beside, it
 * shows only where a report would not show it beside either, so the line
 * looks the same on both.
 */
export function ReportPastLink({
  locale,
  narrowOnly = false,
}: {
  locale: SupportedLocale;
  narrowOnly?: boolean;
}) {
  const link = (
    <>
      <Button
        href={getLocalePath("/reports", locale)}
        linkComponent={SplitViewLink}
        look="ghost"
        icon={<ListBulletsIcon weight="bold" />}
        aria-label={t({ en: "All reports", zh: "全部晨报" })}
        bleed="end"
        css={styles.button}
      />
      <span aria-hidden css={styles.lineBreak} />
    </>
  );
  return narrowOnly ? (
    <div css={styles.narrowOnly}>{link}</div>
  ) : (
    <StackedOnly>{link}</StackedOnly>
  );
}

const styles = stylex.create({
  narrowOnly: {
    display: { default: "none", [NARROW]: "contents" },
  },
  button: {
    marginInlineStart: "auto",
  },
  lineBreak: {
    flexBasis: "100%",
    blockSize: 0,
  },
});
