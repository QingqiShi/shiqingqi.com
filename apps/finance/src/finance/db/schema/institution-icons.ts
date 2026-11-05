import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { bytea } from "./minor.ts";

/**
 * The website domain a model guessed for an institution name, by the
 * normalised name and the currencies the model saw with it, as the same
 * name can be a different institution in another country. `domain` is null
 * when the name is not an institution. Until `guessed_at` is set,
 * `next_attempt_at` is when a worker may ask the model again: a claim
 * pushes it forward, a failure backs it off.
 */
export const institutionDomainGuesses = pgTable(
  "institution_domain_guesses",
  {
    nameKey: text("name_key").notNull(),
    baseCurrency: text("base_currency").notNull(),
    accountCurrency: text("account_currency").notNull(),
    domain: text("domain"),
    guessedAt: timestamp("guessed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.nameKey, t.baseCurrency, t.accountCurrency] }),
  ],
);

/**
 * The website icon of a domain, a small square WebP image. `version` changes
 * with the image, so it is the ETag of the icon. `next_attempt_at` is when a
 * worker may fetch it again: a refresh after a success, a retry after a
 * failure.
 */
export const institutionIcons = pgTable("institution_icons", {
  domain: text("domain").primaryKey(),
  image: bytea("image"),
  version: text("version"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
