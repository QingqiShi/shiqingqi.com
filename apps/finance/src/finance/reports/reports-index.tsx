"use client";

import { t } from "@tuja/i18n";
import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { ReportBodySkeleton } from "./report-body-skeleton.tsx";
import { ReportScreen } from "./report-screen.tsx";
import { useReportList } from "./use-report-list.ts";

/**
 * The content of `/reports`, beside the list where both fit: the newest Report.
 * Where the list covers it, as on a phone, it reads no Report.
 */
export function ReportsIndex() {
  const isShown = useSplitViewColumn()?.isShown ?? true;
  const list = useReportList();
  if (!isShown) return <ReportBodySkeleton />;
  if (list.data === undefined) {
    return list.status === "pending" && list.fetchStatus !== "paused" ? (
      <ReportBodySkeleton />
    ) : null;
  }
  const newestId = list.data.at(0)?.id ?? null;
  if (newestId === null) {
    return (
      <Text as="p" look="bodySmall" tone="muted">
        {t({
          en: "Pick a week to read its report.",
          zh: "选择一周查看周报。",
        })}
      </Text>
    );
  }
  return <ReportScreen id={newestId} headingLevel={2} />;
}
