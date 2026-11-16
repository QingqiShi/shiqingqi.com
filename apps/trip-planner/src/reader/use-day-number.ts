import { t } from "@tuja/i18n";

/** "Day 3", "第 3 天" */
export function useDayNumber() {
  const dayN = t({ en: "Day {n}", zh: "第 {n} 天" });
  return (index: number) => dayN.replace("{n}", String(index));
}
