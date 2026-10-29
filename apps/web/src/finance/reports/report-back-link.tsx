"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Link } from "#src/links/link.tsx";

/** Back to the list of Reports, below `lg` only: wider screens show the list beside the Report. */
export function ReportBackLink() {
  const locale = useLocale();
  return (
    <div css={styles.back}>
      <AnchorButton
        href={getLocalePath("/finance/reports", locale)}
        linkComponent={Link}
        look="ghost"
        size="sm"
        icon={<ArrowLeftIcon weight="bold" />}
      >
        {t({ en: "Reports", zh: "周报" })}
      </AnchorButton>
    </div>
  );
}

const styles = stylex.create({
  back: {
    display: { default: "block", [breakpoints.lg]: "none" },
  },
});
