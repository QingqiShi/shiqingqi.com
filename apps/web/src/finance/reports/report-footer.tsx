"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayMoment } from "../domain/dates/display-moment.ts";
import { fillTemplate } from "./fill-template.ts";
import type { WeeklyReportResponse } from "./report-api-schemas.ts";
import { useRegenerateReport } from "./use-regenerate-report.ts";

/** When the Report was made, and a way to make it again after an edit to that week. */
export function ReportFooter({ report }: { report: WeeklyReportResponse }) {
  const locale = useLocale();
  const { regenerate, pending } = useRegenerateReport();
  const madeAt = displayMoment(report.generatedAt, locale);

  return (
    <footer css={cluster.item}>
      <Text look="caption" tone="muted">
        {fillTemplate(t({ en: "Made {time}", zh: "生成于 {time}" }), {
          time: madeAt,
        })}
      </Text>
      <Button
        size="sm"
        look="ghost"
        icon={<ArrowClockwiseIcon weight="bold" />}
        loading={pending}
        onClick={() => {
          void regenerate(report.periodEnd);
        }}
      >
        {t({ en: "Make again", zh: "重新生成" })}
      </Button>
    </footer>
  );
}
