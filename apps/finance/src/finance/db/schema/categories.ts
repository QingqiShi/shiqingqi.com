import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.ts";
import { createdAt, deletedAt, updatedAt, version } from "./created-at.ts";
import { householdId, householdKey, householdReference } from "./households.ts";
import { NIL_UUID } from "./minor.ts";

// taxonomy

export const categoryKind = pgEnum("category_kind", ["expense", "income"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    parentId: uuid("parent_id"),
    kind: categoryKind("kind").notNull(),
    name: text("name").notNull(),
    emoji: text("emoji").notNull().default(""),
    color: text("color").notNull().default(""),
    position: integer("position").notNull().default(0),
    isSystem: boolean("is_system").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("categories_name_idx")
      .on(
        t.householdId,
        t.kind,
        sql`coalesce(${t.parentId}, ${NIL_UUID})`,
        t.name,
      )
      .where(sql`${t.deletedAt} is null`),
    householdKey("categories", t),
    householdReference("categories_parent_fk", t, t.parentId, t),
  ],
);

export const payees = pgTable(
  "payees",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    name: text("name").notNull(),
    note: text("note").notNull().default(""),
    defaultCategoryId: uuid("default_category_id"),
    defaultAccountId: uuid("default_account_id"),
    mergedIntoId: uuid("merged_into_id"),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("payees_name_idx")
      .on(t.householdId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
    householdKey("payees", t),
    householdReference(
      "payees_default_category_fk",
      t,
      t.defaultCategoryId,
      categories,
    ),
    householdReference(
      "payees_default_account_fk",
      t,
      t.defaultAccountId,
      accounts,
    ),
    householdReference("payees_merged_into_fk", t, t.mergedIntoId, t),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("tags_name_idx")
      .on(t.householdId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
    householdKey("tags", t),
  ],
);
