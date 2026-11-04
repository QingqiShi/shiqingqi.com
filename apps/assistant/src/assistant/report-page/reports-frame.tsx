"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";
import { Link, LinkStatus } from "#src/links/link.tsx";
import type { ReportListItem } from "../report/read-report.ts";
import { formatDay } from "./format-day.ts";
import { ReportBodySkeleton } from "./report-body-skeleton.tsx";
import { ReportList } from "./report-list.tsx";

interface ReportsFrameProps {
  reports: readonly ReportListItem[];
  /** The user's local date, `YYYY-MM-DD`. */
  today: string;
  children: ReactNode;
}

/**
 * The home page and the morning reports: the list of days beside the page where
 * both fit. Where they do not, `/` shows no list, `/reports` is the list, and a
 * report opens over it.
 */
export function ReportsFrame({ reports, today, children }: ReportsFrameProps) {
  const segments = useSelectedLayoutSegments();
  const isOnList = segments.length === 1;
  const openDate = segments.at(1) ?? null;
  const latestDate = reports.at(0)?.localDate ?? null;
  return (
    <ReportsColumns
      segments={segments}
      list={
        <ReportList
          reports={reports}
          today={today}
          currentDate={openDate ?? (isOnList ? latestDate : null)}
          headingLevel={isOnList ? 1 : 2}
        />
      }
    >
      {children}
    </ReportsColumns>
  );
}

interface ReportsColumnsProps {
  /** The segments of the URL below `/`: none on the home page, `reports`, then the date. */
  segments: readonly string[];
  list: ReactNode;
  children: ReactNode;
}

/** The columns of the reports, with the list as a prop, so that the skeleton can show them. */
export function ReportsColumns({
  segments,
  list,
  children,
}: ReportsColumnsProps) {
  const locale = useLocale();
  const router = useRouter();
  const isHome = segments.length === 0;
  const openDate = segments.at(1) ?? null;
  const listHref = getLocalePath("/reports", locale);
  const listLabel = t({ en: "Past reports", zh: "往期晨报" });

  return (
    <NavigationSplitView
      linkComponent={Link}
      linkStatus={LinkStatus}
      skeleton={<ReportBodySkeleton />}
      css={pageColumn.report}
      replace={(href) => {
        router.replace(href);
      }}
      sidebar={{
        stacked: isHome ? "hidden" : "page",
        href: listHref,
        label: listLabel,
        node: list,
      }}
      content={{
        key: isHome ? "home" : (openDate ?? "latest"),
        label: isHome
          ? t({ en: "Today", zh: "今天" })
          : openDate === null
            ? t({ en: "Morning report", zh: "晨报" })
            : formatDay(openDate, locale),
        back: openDate === null ? null : { href: listHref, label: listLabel },
        node: children,
      }}
    />
  );
}
