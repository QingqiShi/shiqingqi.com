import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

interface ReportGroupBar {
  id: string;
  name: string;
  /** The Group's balance-sheet total: below zero for a liability Group. */
  valueMinor: number;
}

/**
 * One bar per Group with its balance-sheet total, so each bar matches a line
 * of the balance sheet. A liability Group follows the asset Group it is
 * named after (不动产负债 after 不动产), as `groupNets` pairs them.
 */
export function reportGroupBars(data: WeeklyReportData): ReportGroupBar[] {
  const groups = new Map(
    [
      ...data.balanceSheet.assets.groups,
      ...data.balanceSheet.liabilities.groups,
    ].map((group) => [group.id, group]),
  );
  const bars: ReportGroupBar[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    const group = groups.get(id);
    if (!group || seen.has(id)) return;
    seen.add(id);
    bars.push({ id, name: group.name, valueMinor: group.totalMinor });
  };
  for (const family of data.groupNets) family.groupIds.forEach(add);
  for (const id of groups.keys()) add(id);
  return bars;
}
