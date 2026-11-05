import { timestamp } from "drizzle-orm/pg-core";
import { minor } from "./minor.ts";

export function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

export function updatedAt() {
  return timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
}

export function deletedAt() {
  return timestamp("deleted_at", { withTimezone: true });
}

export function version() {
  return minor("version").notNull();
}
