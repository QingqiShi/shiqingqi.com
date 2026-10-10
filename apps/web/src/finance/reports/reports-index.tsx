"use client";

import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { ReportScreen } from "./report-screen.tsx";
import { selectReportRows } from "./select-report-rows.ts";

/** The pane beside the list at `lg` and wider: the newest Report. Below `lg` the list is the whole page. */
export function ReportsIndex() {
  const isWide = useIsWideLayout();
  const newestId = useReplica(
    (snapshot) => selectReportRows(snapshot).at(0)?.id ?? null,
  );
  if (!isWide) return null;
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
