import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { AnchorButton } from "#src/links/anchor-button.tsx";

/**
 * The way to the list of reports, below `lg` only: wider screens show the
 * list beside the report. `back` is for a report that the list opened.
 */
export function ReportPastLink({
  kind,
  locale,
}: {
  kind: "back" | "list";
  locale: SupportedLocale;
}) {
  return (
    <div css={styles.link}>
      <AnchorButton
        href={getLocalePath("/reports", locale)}
        look="ghost"
        size="sm"
        icon={
          kind === "back" ? (
            <ArrowLeftIcon weight="bold" />
          ) : (
            <ListBulletsIcon weight="bold" />
          )
        }
      >
        {t({ en: "Past reports", zh: "往期晨报" })}
      </AnchorButton>
    </div>
  );
}

const styles = stylex.create({
  link: {
    display: { default: "block", [breakpoints.lg]: "none" },
  },
});
