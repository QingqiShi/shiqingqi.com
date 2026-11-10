"use client";

import { t } from "@tuja/i18n";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { Heading } from "@tuja/ui/components/heading";
import { useTabViewOpening } from "@tuja/ui/components/tab-view";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { usePathname } from "next/navigation";
import { SkeletonList } from "../shell/skeleton-list.tsx";
import { ReportBodySkeleton } from "./report-body-skeleton.tsx";
import { ReportsColumns } from "./reports-frame.tsx";

/**
 * The home page and the reports before they can show, in their real columns:
 * the tab that opens goes to the home page, and else the URL says which page
 * loads.
 */
export function ReportsSkeleton() {
  const isOpening = useTabViewOpening() !== null;
  const path = normalizePath(usePathname());
  const segments = isOpening ? [] : path.split("/").filter(Boolean);
  return (
    <ReportsColumns
      segments={segments}
      list={
        <div css={stack.item} aria-busy>
          <Heading level={segments.length === 1 ? 1 : 2}>
            {t({ en: "All reports", zh: "全部晨报" })}
          </Heading>
          <SkeletonList rows={6} width="80%" />
        </div>
      }
    >
      <ReportBodySkeleton />
    </ReportsColumns>
  );
}
