import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";
import { createdAt, version } from "./created-at.ts";
import { householdId } from "./households.ts";
import { currency } from "./minor.ts";

// fx

/**
 * Retired, with `entries.fx_rate`. Only older deployments use them. A later
 * migration removes them.
 */
export const fxRates = pgTable(
  "fx_rates",
  {
    householdId: householdId(),
    base: currency("base").notNull(),
    quote: currency("quote").notNull(),
    on: date("on", { mode: "string" }).notNull(),
    rate: numeric("rate", {
      precision: 18,
      scale: 8,
      mode: "number",
    }).notNull(),
    source: text("source").notNull().default("manual"),
    version: version(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.base, t.quote, t.on] })],
);

/**
 * Not part of a Household. `seq` orders the rows by when they arrived, so a
 * device can download only the new ones.
 */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    base: currency("base").notNull(),
    quote: currency("quote").notNull(),
    on: date("on", { mode: "string" }).notNull(),
    rate: numeric("rate", {
      precision: 18,
      scale: 8,
      mode: "number",
    }).notNull(),
    source: text("source").notNull(),
    seq: bigint("seq", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.base, t.quote, t.on] }),
    check(
      "exchange_rates_source_check",
      sql`${t.source} in ('household', 'ecb')`,
    ),
    check("exchange_rates_rate_check", sql`${t.rate} > 0`),
    index("exchange_rates_seq_idx").on(t.seq),
  ],
);
