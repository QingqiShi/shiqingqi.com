import type { Fundamentals } from "../contracts/fundamentals-schema.ts";
import { toMajorUnits } from "../orders/to-major-units.ts";
import type { RawFundamentals, StatementRow } from "./types.ts";

type Figure = Exclude<keyof StatementRow, "periodEnd">;

interface Rates {
  /** Units of the financial currency for one major unit of the price currency; null when the financial currency is not known. */
  toFinancial: number | null;
  /** GBP for one major unit of the price currency. */
  toGbp: number;
}

/** The newest value of `figure` among `lists`; a later list wins a tie. */
function newest(lists: StatementRow[][], figure: Figure): number | null {
  let found: { periodEnd: string; value: number } | null = null;
  for (const rows of lists) {
    for (const row of rows) {
      const value = row[figure];
      if (value !== null && (!found || row.periodEnd >= found.periodEnd)) {
        found = { periodEnd: row.periodEnd, value };
      }
    }
  }
  return found?.value ?? null;
}

/**
 * The row with a diluted EPS that agrees with its own net income over its
 * shares. The provider sometimes gives one period's EPS in pence or for the
 * wrong period; then the EPS that the row implies replaces it.
 */
function withCheckedEps(row: StatementRow): StatementRow {
  const { dilutedEps, netIncome, dilutedShares } = row;
  if (dilutedEps === null || netIncome === null || !dilutedShares) return row;
  const implied = netIncome / dilutedShares;
  const ratio = dilutedEps / implied;
  return ratio >= 1 / 3 && ratio <= 3 ? row : { ...row, dilutedEps: implied };
}

function times(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a * b;
}

/** `a / b` when `b` is positive; a ratio over zero or a loss has no meaning. */
function over(a: number | null, b: number | null): number | null {
  return a === null || b === null || b <= 0 ? null : a / b;
}

/**
 * The `Fundamentals` of one stock. Every price and value is converted to the
 * financial currency before it meets a figure of the statements.
 */
export function buildFundamentals(
  raw: RawFundamentals,
  {
    quoteScale,
    today,
    rates,
  }: { quoteScale: number; today: string; rates: Rates },
): Fundamentals {
  const annual = raw.annual.map(withCheckedEps);
  const quarterly = raw.quarterly.map(withCheckedEps);
  const twelveMonths = [annual, raw.trailing.map(withCheckedEps)];
  const balanceSheets = [annual, quarterly];
  const price =
    raw.price === null ? null : toMajorUnits(raw.price, { quoteScale });
  const priceInFinancial = times(price, rates.toFinancial);
  const marketCapInFinancial = times(raw.marketCap, rates.toFinancial);
  const trailingEps = newest(twelveMonths, "dilutedEps");
  const debt = newest(balanceSheets, "totalDebt");
  const cash = newest(balanceSheets, "cash");
  const enterpriseValue =
    marketCapInFinancial === null || debt === null || cash === null
      ? null
      : marketCapInFinancial + debt - cash;
  const pegRatio =
    raw.pegRatio !== null && raw.pegRatio > 0 ? raw.pegRatio : null;

  return {
    financialCurrency: raw.financialCurrency,
    marketCapGbp: times(raw.marketCap, rates.toGbp),
    trailingEps,
    forwardEps: raw.forwardEps,
    trailingPe: over(priceInFinancial, trailingEps),
    forwardPe: over(priceInFinancial, raw.forwardEps),
    pegRatio,
    priceToBook: over(
      marketCapInFinancial,
      newest(balanceSheets, "commonStockEquity"),
    ),
    evToEbitda: over(enterpriseValue, newest(twelveMonths, "ebitda")),
    freeCashFlowYield: over(
      newest(twelveMonths, "freeCashFlow"),
      marketCapInFinancial,
    ),
    dividendYield: raw.dividendYield,
    returnOnEquity: raw.returnOnEquity,
    profitMargin: raw.profitMargin,
    revenueGrowth: raw.revenueGrowth,
    earningsGrowth: raw.earningsGrowth,
    debtToEquity:
      raw.debtToEquityPct === null ? null : raw.debtToEquityPct / 100,
    nextEarningsDate:
      raw.earningsDates
        .map((instant) => instant.slice(0, 10))
        .filter((date) => date >= today)
        .sort()[0] ?? null,
    exDividendDate: raw.exDividendDate?.slice(0, 10) ?? null,
    analystTargetMean:
      raw.analystTargetMean === null
        ? null
        : toMajorUnits(raw.analystTargetMean, { quoteScale }),
    analystRecommendation: raw.analystRecommendation,
    quarterlyEps: quarterly
      .flatMap(({ periodEnd, dilutedEps }) =>
        dilutedEps === null ? [] : [{ period: periodEnd, eps: dilutedEps }],
      )
      .slice(-8),
    annual: annual
      .filter(
        (row) =>
          row.revenue !== null ||
          row.netIncome !== null ||
          row.dilutedEps !== null ||
          row.freeCashFlow !== null,
      )
      .slice(-4)
      .map(({ periodEnd, revenue, netIncome, dilutedEps, freeCashFlow }) => ({
        period: periodEnd,
        revenue,
        netIncome,
        dilutedEps,
        freeCashFlow,
      })),
  };
}
