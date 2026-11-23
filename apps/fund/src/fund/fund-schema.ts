import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

/** A calendar date as `YYYY-MM-DD`, in the local time of the exchange. */
function day(name: string) {
  return date(name, { mode: "string" });
}

/**
 * Everything the fund can price: the stocks of the universe, the two index
 * benchmarks and the GBPUSD rate. `symbol` is the Yahoo symbol.
 */
export const instruments = pgTable("instruments", {
  symbol: text("symbol").primaryKey(),
  kind: text("kind", { enum: ["stock", "benchmark", "fx"] }).notNull(),
  name: text("name").notNull(),
  exchange: text("exchange", { enum: ["LSE", "US"] }),
  /** The currency of stored prices: always a major unit, never pence. */
  currency: text("currency", { enum: ["GBP", "USD"] }).notNull(),
  /**
   * Quote units in one major unit: 100 for a London stock, which trades in
   * pence, and 1 otherwise. People and agents see quote units; the database
   * and all arithmetic use major units.
   */
  quoteScale: integer("quote_scale").notNull().default(1),
  sector: text("sector"),
  industry: text("industry"),
  index: text("index", { enum: ["FTSE100", "SP100"] }),
  active: boolean("active").notNull().default(true),
});

/**
 * One finished trading session. A session still in progress is never stored.
 * Prices are raw (not adjusted) in major units; `adjClose` is for return
 * signals only.
 */
export const dailyBars = pgTable(
  "daily_bars",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => instruments.symbol, { onDelete: "cascade" }),
    date: day("date").notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    adjClose: doublePrecision("adj_close").notNull(),
    volume: bigint("volume", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.date] })],
);

/** Cash dividends per share, in the major unit of the instrument. */
export const dividends = pgTable(
  "dividends",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => instruments.symbol, { onDelete: "cascade" }),
    exDate: day("ex_date").notNull(),
    amount: doublePrecision("amount").notNull(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.exDate] })],
);

/**
 * A snapshot of earnings and valuation data for one stock. `data` is a
 * `Fundamentals` (`contracts.ts`). The provider gives only the present
 * values, so a replay of a past date reads a snapshot from its future.
 */
export const fundamentals = pgTable(
  "fundamentals",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => instruments.symbol, { onDelete: "cascade" }),
    fetchedOn: day("fetched_on").notNull(),
    data: jsonb("data").notNull(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.fetchedOn] })],
);

/**
 * Cash that does not come from a trade: the starting deposit and dividends.
 * Trade cash comes from `fills`. Amounts are signed GBP.
 */
export const cashEntries = pgTable("cash_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: day("date").notNull(),
  kind: text("kind", { enum: ["deposit", "dividend"] }).notNull(),
  amountGbp: doublePrecision("amount_gbp").notNull(),
  symbol: text("symbol").references(() => instruments.symbol),
  /** For a dividend: `<symbol>:<exDate>`, so that it is paid only once. */
  dedupeKey: text("dedupe_key").unique(),
  note: text("note"),
  createdAt: createdAt(),
});

/**
 * One meeting. `asOf` is the date of the session that the decisions are for:
 * the meeting sees only sessions that ended before it. There is one run of
 * each kind for a date; a run that failed continues from its first step that
 * is not done.
 */
export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind", { enum: ["strategy", "daily"] }).notNull(),
    asOf: day("as_of").notNull(),
    status: text("status", {
      enum: ["blocked", "running", "completed", "failed"],
    }).notNull(),
    modelTier: text("model_tier", { enum: ["dev", "live"] }).notNull(),
    error: text("error"),
    /** The worker writes this while it works; an old value means it died. */
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    createdAt: createdAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [unique("runs_kind_as_of_key").on(t.kind, t.asOf)],
);

/**
 * One step of a run, and also one item of the meeting minutes. `input` is
 * the exact pack the agent saw; `output` is its structured answer; `memo` is
 * the text for a person to read.
 */
export const runSteps = pgTable(
  "run_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    /** Such as `data`, `screen`, `macro`, `analyst:AAPL`, `pm_draft`. */
    key: text("key").notNull(),
    position: integer("position").notNull(),
    role: text("role", {
      enum: ["system", "strategist", "analyst", "pm", "risk"],
    }).notNull(),
    status: text("status", {
      enum: ["pending", "running", "done", "failed", "skipped"],
    }).notNull(),
    input: jsonb("input"),
    output: jsonb("output"),
    memo: text("memo"),
    model: text("model"),
    /** A `StepUsage`. */
    usage: jsonb("usage"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [unique("run_steps_run_key_key").on(t.runId, t.key)],
);

/**
 * The long-term logic. The `fund` thesis is the mandate and the plan; a
 * `position` thesis says why the fund owns one stock and what would prove
 * it wrong.
 */
export const theses = pgTable("theses", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: text("scope", { enum: ["fund", "position"] }).notNull(),
  symbol: text("symbol").references(() => instruments.symbol),
  status: text("status", {
    enum: ["active", "closed", "invalidated"],
  }).notNull(),
  createdAt: createdAt(),
});

export const thesisVersions = pgTable(
  "thesis_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    thesisId: uuid("thesis_id")
      .notNull()
      .references(() => theses.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
    /** A `FundThesis` or a `PositionThesis`, by the scope of the thesis. */
    body: jsonb("body").notNull(),
    changeNote: text("change_note"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("thesis_versions_thesis_version_key").on(t.thesisId, t.version),
  ],
);

/** The risk budget: each version is a whole `RiskPolicy`. The newest rules. */
export const riskPolicyVersions = pgTable("risk_policy_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: integer("version").notNull().unique(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
  policy: jsonb("policy").notNull(),
  changeNote: text("change_note"),
  createdAt: createdAt(),
});

/**
 * A limit order for the owner to place. Prices are major units. The order
 * stays `open` until the owner records what happened or its last day passes.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id),
    symbol: text("symbol")
      .notNull()
      .references(() => instruments.symbol),
    side: text("side", { enum: ["buy", "sell"] }).notNull(),
    quantity: integer("quantity").notNull(),
    limitPrice: doublePrecision("limit_price").notNull(),
    /** The first session the order is live in: the `asOf` of its run. */
    placedFor: day("placed_for").notNull(),
    /** The last session the order is live in. */
    validUntil: day("valid_until").notNull(),
    /** What the PM committed to do if the order ends without a fill. */
    onExpiry: text("on_expiry", {
      enum: ["cancel", "reprice", "reassess"],
    }).notNull(),
    /** For `reprice`: the worst limit the PM accepts, in major units. */
    repriceLimit: doublePrecision("reprice_limit"),
    unfilledPlan: text("unfilled_plan").notNull(),
    rationale: text("rationale").notNull(),
    thesisId: uuid("thesis_id").references(() => theses.id),
    status: text("status", {
      enum: ["open", "filled", "expired", "cancelled"],
    }).notNull(),
    /**
     * The owner has said what happened in every session up to this date. A
     * new meeting waits until this reaches the session before it.
     */
    checkedThrough: day("checked_through"),
    statusNote: text("status_note"),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("orders_status_idx").on(t.status)],
);

/**
 * What the owner says traded. Fills are the only source of positions: lots,
 * the 30-day lock, cash from trades and profit are all derived from them.
 */
export const fills = pgTable("fills", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  symbol: text("symbol")
    .notNull()
    .references(() => instruments.symbol),
  side: text("side", { enum: ["buy", "sell"] }).notNull(),
  quantity: integer("quantity").notNull(),
  /** Per share, in the major unit of the instrument. */
  price: doublePrecision("price").notNull(),
  /** USD for one GBP on the fill date; 1 for a GBP instrument. */
  gbpUsd: doublePrecision("gbp_usd").notNull(),
  feesGbp: doublePrecision("fees_gbp").notNull().default(0),
  filledOn: day("filled_on").notNull(),
  createdAt: createdAt(),
});

/**
 * The trade journal: one entry for each decision (a hold and "no action"
 * included) and each thing that happened to an order. The PM reads it before
 * each decision.
 */
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
    date: day("date").notNull(),
    symbol: text("symbol").references(() => instruments.symbol),
    kind: text("kind", {
      enum: [
        "buy",
        "sell",
        "hold",
        "no_action",
        "cancel_order",
        "rejected",
        "filled",
        "not_filled",
        "expired",
        "strategy",
      ],
    }).notNull(),
    /** One line. */
    summary: text("summary").notNull(),
    /** The full logic, as markdown. */
    rationale: text("rationale").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("journal_entries_symbol_idx").on(t.symbol),
    index("journal_entries_run_id_idx").on(t.runId),
  ],
);

export const fundSchema = {
  instruments,
  dailyBars,
  dividends,
  fundamentals,
  cashEntries,
  runs,
  runSteps,
  theses,
  thesisVersions,
  riskPolicyVersions,
  orders,
  fills,
  journalEntries,
};
