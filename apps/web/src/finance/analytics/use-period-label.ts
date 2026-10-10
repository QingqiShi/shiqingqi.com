import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import type { AnalyticsView } from "./compute-analytics-view.ts";
import { formatPeriod } from "./format-period.ts";

/** A period in full for a readout or a table row, marked when the range cuts it short. */
export function usePeriodLabel(view: AnalyticsView): (index: number) => string {
  const locale = useLocale();
  const soFar = t({ en: "so far", zh: "截至今天" });
  const part = t({ en: "partial", zh: "不完整" });
  return (index) => {
    const label = formatPeriod(
      view.boundaries,
      index,
      view.grouping,
      locale,
      "full",
    );
    if (view.partial[index] !== 1) return label;
    const ongoing =
      view.lastPeriodOngoing && index === view.boundaries.length - 2;
    return `${label} · ${ongoing ? soFar : part}`;
  };
}
