import type { Icon } from "@phosphor-icons/react";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/ssr/ChartLineUp";
import { ChartPieSliceIcon } from "@phosphor-icons/react/dist/ssr/ChartPieSlice";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { NewspaperIcon } from "@phosphor-icons/react/dist/ssr/Newspaper";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { t } from "#src/i18n.ts";
import { FINANCE_DESTINATION_PATHS } from "./finance-destination-paths.ts";

interface FinanceDestination {
  /** Locale-free, such as `/finance/transactions`. */
  path: string;
  label: string;
  icon: Icon;
}

/** The five Finance destinations with their labels, for the rail and the tab bar. */
// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- the i18n transform adds a useI18nTranslations hook call to each function that calls t(), so the prefix is earned; the rule only sees the pre-transform source
export function useFinanceDestinations(): FinanceDestination[] {
  const [netWorth, transactions, analytics, reports, settings] =
    FINANCE_DESTINATION_PATHS;
  return [
    {
      path: netWorth,
      label: t({ en: "Net worth", zh: "净资产" }),
      icon: ChartLineUpIcon,
    },
    {
      path: transactions,
      label: t({ en: "Transactions", zh: "交易" }),
      icon: ReceiptIcon,
    },
    {
      path: analytics,
      label: t({ en: "Analytics", zh: "分析" }),
      icon: ChartPieSliceIcon,
    },
    {
      path: reports,
      label: t({ en: "Reports", zh: "周报" }),
      icon: NewspaperIcon,
    },
    {
      path: settings,
      label: t({ en: "Settings", zh: "设置" }),
      icon: GearSixIcon,
    },
  ];
}
