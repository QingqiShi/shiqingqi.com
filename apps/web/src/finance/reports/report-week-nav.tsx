"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Button } from "@tuja/ui/components/button";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import Link from "next/link";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import type { ReportRow } from "../sync/row-schemas.ts";
import { formatReportWeek } from "./format-report-week.ts";

interface ReportWeekNavProps {
  older: ReportRow | null;
  newer: ReportRow | null;
}

/** Steps to the Report of the week before or after. */
export function ReportWeekNav({ older, newer }: ReportWeekNavProps) {
  const locale = useLocale();
  const labels = {
    older: t({ en: "Week before", zh: "上一周" }),
    newer: t({ en: "Week after", zh: "下一周" }),
  };
  const colon = t({ en: ": ", zh: "：" });
  const link = (
    report: ReportRow | null,
    label: string,
    icon: React.ReactNode,
  ) =>
    report === null ? (
      <Button size="sm" look="ghost" icon={icon} disabled>
        {label}
      </Button>
    ) : (
      <AnchorButton
        href={getLocalePath(`/finance/reports/${report.id}`, locale)}
        linkComponent={Link}
        size="sm"
        look="ghost"
        icon={icon}
        aria-label={`${label}${colon}${formatReportWeek(report.periodStart, report.periodEnd, locale)}`}
      >
        {label}
      </AnchorButton>
    );

  return (
    <nav aria-label={t({ en: "Weeks", zh: "按周浏览" })} css={cluster.tight}>
      {link(older, labels.older, <CaretLeftIcon weight="bold" />)}
      {link(newer, labels.newer, <CaretRightIcon weight="bold" />)}
    </nav>
  );
}
