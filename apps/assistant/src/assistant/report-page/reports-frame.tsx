"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link, LinkStatus } from "@tuja/next-links/link";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import {
  useRouter,
  useSearchParams,
  useSelectedLayoutSegments,
} from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { askedHomeView } from "../home/choose-home-view.ts";
import type { ReportListItem } from "../report/read-report.ts";
import { useDateLocale } from "../shell/date-locale-provider.tsx";
import { formatDay } from "./format-day.ts";
import { ReportBodySkeleton } from "./report-body-skeleton.tsx";
import { ReportList } from "./report-list.tsx";

interface ReportsFrameProps {
  reports: readonly ReportListItem[];
  children: ReactNode;
}

const HomeReportContext = createContext<(date: string | null) => void>(
  () => undefined,
);

/** Tells the list which report the home page shows, so that the list marks it. */
export function HomeReportMark({ date }: { date: string }) {
  const setHomeReportDate = use(HomeReportContext);
  useEffect(() => {
    setHomeReportDate(date);
    return () => {
      setHomeReportDate(null);
    };
  }, [date, setHomeReportDate]);
  return null;
}

/**
 * The home page and the morning reports: the list of days beside the page where
 * both fit. Where they do not, `/` shows no list, `/reports` is the list, and a
 * report opens over it. The plan is about the day, not the reports, so it
 * shows no list.
 */
export function ReportsFrame({ reports, children }: ReportsFrameProps) {
  const segments = useSelectedLayoutSegments();
  const [homeReportDate, setHomeReportDate] = useState<string | null>(null);
  const isHome = segments.length === 0;
  const isOnList = segments.length === 1;
  const openDate = segments.at(1) ?? null;
  const latestDate = reports.at(0)?.localDate ?? null;
  return (
    <HomeReportContext value={setHomeReportDate}>
      <ReportsColumns
        segments={segments}
        list={
          <ReportList
            reports={reports}
            currentDate={
              openDate ??
              (isOnList ? latestDate : isHome ? homeReportDate : null)
            }
            headingLevel={isOnList ? 1 : 2}
          />
        }
      >
        {children}
      </ReportsColumns>
    </HomeReportContext>
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
  const dateLocale = useDateLocale();
  const router = useRouter();
  const asked = useSearchParams().get("view") ?? undefined;
  const isHome = segments.length === 0;
  const isPlan = isHome && askedHomeView(asked) === "today";
  const openDate = segments.at(1) ?? null;
  const listHref = getLocalePath("/reports", locale);
  const listLabel = t({ en: "All reports", zh: "全部晨报" });

  return (
    <NavigationSplitView
      linkComponent={Link}
      linkStatus={LinkStatus}
      skeleton={<ReportBodySkeleton />}
      css={pageColumn.report}
      replace={(href) => {
        router.replace(href);
      }}
      sidebar={
        isPlan
          ? undefined
          : {
              stacked: isHome ? "hidden" : "page",
              href: listHref,
              label: listLabel,
              node: list,
            }
      }
      content={{
        key: isHome ? "home" : (openDate ?? "latest"),
        label: isHome
          ? t({ en: "Today", zh: "今天" })
          : openDate === null
            ? t({ en: "Morning report", zh: "晨报" })
            : formatDay(openDate, dateLocale),
        back: openDate === null ? null : { href: listHref, label: listLabel },
        node: children,
      }}
    />
  );
}
