import { makeAuthTables } from "@tuja/server-auth/make-auth-tables";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** A person with an account. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  /** The address that signed up, lower-case and confirmed. A lost passkey is recovered through it. */
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** The tables of sign-in that every app has. */
export const { emailCodes, signUps, recoveries, passkeys, sessions } =
  makeAuthTables(() => users.id);

export const authSchema = {
  users,
  passkeys,
  sessions,
  emailCodes,
  signUps,
  recoveries,
};
