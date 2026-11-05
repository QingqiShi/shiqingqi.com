import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../../domain/dates/default-household-time-zone.ts";
import { createdAt, deletedAt, updatedAt, version } from "./created-at.ts";
import { bytea, currency, minor } from "./minor.ts";
import { users } from "./users.ts";

export const households = pgTable(
  "households",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    baseCurrency: currency("base_currency").notNull().default("GBP"),
    timezone: text("timezone").notNull().default(DEFAULT_HOUSEHOLD_TIME_ZONE),
    aiInstructions: text("ai_instructions").notNull().default(""),
    clock: minor("clock").notNull().default(0),
    demo: boolean("demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("households_one_demo")
      .on(table.demo)
      .where(sql`${table.demo}`),
  ],
);

export function householdId() {
  return uuid("household_id")
    .notNull()
    .references(() => households.id);
}

type HouseholdTable = {
  householdId: AnyPgColumn;
  id: AnyPgColumn;
};

/**
 * A reference that stays inside the Household: `(household_id, column)`
 * points at the parent's `(household_id, id)`, so the database refuses a row
 * that points at another Household's row.
 */
export function householdReference(
  name: string,
  table: { householdId: AnyPgColumn },
  column: AnyPgColumn,
  parent: HouseholdTable,
) {
  return foreignKey({
    name,
    columns: [table.householdId, column],
    foreignColumns: [parent.householdId, parent.id],
  });
}

/** The key that `householdReference` points at. */
export function householdKey(table: string, t: HouseholdTable) {
  return unique(`${table}_household_id_id_key`).on(t.householdId, t.id);
}

export const memberRole = pgEnum("member_role", ["owner", "member"]);

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    userId: uuid("user_id").references(() => users.id),
    name: text("name").notNull(),
    role: memberRole("role").notNull().default("member"),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("members_household_idx").on(t.householdId),
    unique("members_user_key").on(t.userId),
    householdKey("members", t),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    memberId: uuid("member_id").notNull(),
    tokenHash: bytea("token_hash").notNull().unique(),
    /** Null when the operator made the invite with `finance:invite-link`. */
    createdBy: uuid("created_by").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    /** Set when the invite lets a Member who lost every passkey back in: the user it adds a passkey to. */
    recoveryUserId: uuid("recovery_user_id").references(() => users.id),
  },
  (t) => [householdReference("invites_member_fk", t, t.memberId, members)],
);
