import { currencyExponent } from "../../domain/money/currency-exponent.ts";
import { toMinorUnits } from "../../domain/money/to-minor-units.ts";

/** A source amount that rounding moved by more than 0.001 of a major unit. */
export interface RoundingNote {
  table: string;
  id: string;
  source: number;
  currency: string;
  minor: number;
}

export interface Rounder {
  /** Rounds half to even to minor units and records what rounding moved. */
  toMinor: (
    value: number,
    currency: string,
    where: { table: string; id: string; accountId?: string },
  ) => number;
  /** Records a rounding made elsewhere. */
  record: (
    value: number,
    minor: number,
    currency: string,
    where: { table: string; id: string; accountId?: string },
  ) => void;
  notes: RoundingNote[];
  /** Per account: Σ (rounded − source) in minor units, over its entries and valuations. */
  residueByAccount: Map<string, number>;
}

const REPORT_ABOVE_MAJOR = 0.001;

export function createRounder(): Rounder {
  const notes: RoundingNote[] = [];
  const residueByAccount = new Map<string, number>();
  const record: Rounder["record"] = (value, minor, currency, where) => {
    const scale = 10 ** currencyExponent(currency);
    const residue = minor - value * scale;
    if (Math.abs(residue) > REPORT_ABOVE_MAJOR * scale) {
      notes.push({
        table: where.table,
        id: where.id,
        source: value,
        currency,
        minor,
      });
    }
    if (where.accountId !== undefined) {
      residueByAccount.set(
        where.accountId,
        (residueByAccount.get(where.accountId) ?? 0) + residue,
      );
    }
  };
  return {
    notes,
    residueByAccount,
    record,
    toMinor(value, currency, where) {
      const minor = toMinorUnits(value, currency);
      record(value, minor, currency, where);
      return minor;
    },
  };
}
