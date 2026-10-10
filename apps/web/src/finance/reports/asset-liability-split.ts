import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

interface AssetLiabilitySplit {
  assetsMinor: number;
  /** What is owed, as a positive amount. */
  liabilitiesMinor: number;
  /** The assets' share of assets plus liabilities, 0–1. */
  assetShare: number;
  liabilityShare: number;
}

/** Assets against liabilities, as the two parts of one bar. */
export function assetLiabilitySplit(
  balanceSheet: WeeklyReportData["balanceSheet"],
): AssetLiabilitySplit {
  const assetsMinor = Math.max(balanceSheet.assets.totalMinor, 0);
  const liabilitiesMinor = Math.abs(
    Math.min(balanceSheet.liabilities.totalMinor, 0),
  );
  const total = assetsMinor + liabilitiesMinor;
  const assetShare = total === 0 ? 0 : assetsMinor / total;
  return {
    assetsMinor,
    liabilitiesMinor,
    assetShare,
    liabilityShare: total === 0 ? 0 : 1 - assetShare,
  };
}
