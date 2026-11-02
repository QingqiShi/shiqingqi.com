import { and, asc, eq, ne } from "drizzle-orm";
import type {
  CalendarConnector,
  CalendarSession,
} from "#src/assistant/calendar/caldav/types.ts";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  resolveMailboxAuth,
  type MailboxAuthDeps,
  type StoredAccount,
} from "#src/assistant/mail/accounts/resolve-mailbox-auth.ts";
import { ToolRefusal } from "../agent-tool.ts";

export interface CalendarDeps {
  calendarConnector: CalendarConnector;
  auth: MailboxAuthDeps;
}

/** A calendar as the model knows it: by a short key such as `c1`. */
export interface RunCalendar {
  key: string;
  accountId: string;
  address: string;
  url: string;
  name: string;
  isDefault: boolean;
  shared: boolean;
  canWrite: boolean;
}

/** Which calendars the agent may change. */
export type CalendarPolicy = (
  calendar: Pick<RunCalendar, "accountId" | "url" | "name">,
) => { canWrite: boolean };

/** The owner lets the agent change every calendar; a setting per calendar can take its place. */
export const writeEveryCalendar: CalendarPolicy = () => ({ canWrite: true });

export interface UnavailableCalendarAccount {
  address: string;
  error: string;
}

interface Loaded {
  calendars: RunCalendar[];
  unavailable: UnavailableCalendarAccount[];
  sessions: Map<string, CalendarSession>;
}

/**
 * The iCloud calendars of one user for one agent run. They log in with the
 * app-specific password of the user's own iCloud mail accounts, only when a
 * tool first needs them, and keep the sessions for the whole run.
 */
export class RunCalendars {
  readonly #db: AssistantDb;
  readonly #userId: string;
  readonly #deps: CalendarDeps;
  readonly #policy: CalendarPolicy;
  readonly #accounts: StoredAccount[];
  #loaded: Promise<Loaded> | null = null;

  private constructor(
    db: AssistantDb,
    userId: string,
    deps: CalendarDeps,
    policy: CalendarPolicy,
    accounts: StoredAccount[],
  ) {
    this.#db = db;
    this.#userId = userId;
    this.#deps = deps;
    this.#policy = policy;
    this.#accounts = accounts;
  }

  /** Reads the user's iCloud accounts that do not wait for a new connect. It logs in to none. */
  static async open(
    db: AssistantDb,
    userId: string,
    deps: CalendarDeps,
    policy: CalendarPolicy = writeEveryCalendar,
  ): Promise<RunCalendars> {
    const accounts = await db
      .select({
        id: mailAccounts.id,
        provider: mailAccounts.provider,
        address: mailAccounts.address,
        credential: mailAccounts.credential,
      })
      .from(mailAccounts)
      .where(
        and(
          eq(mailAccounts.userId, userId),
          eq(mailAccounts.provider, "icloud"),
          ne(mailAccounts.status, "reconnect"),
        ),
      )
      .orderBy(asc(mailAccounts.createdAt));
    return new RunCalendars(db, userId, deps, policy, accounts);
  }

  get hasAccounts() {
    return this.#accounts.length > 0;
  }

  async #load(): Promise<Loaded> {
    const loaded: Loaded = {
      calendars: [],
      unavailable: [],
      sessions: new Map(),
    };
    for (const account of this.#accounts) {
      try {
        const auth = await resolveMailboxAuth(
          this.#db,
          this.#userId,
          account,
          this.#deps.auth,
        );
        if (!("pass" in auth)) {
          throw new Error("The iCloud account has no app-specific password");
        }
        const session = await this.#deps.calendarConnector({
          user: auth.user,
          pass: auth.pass,
        });
        const calendars = await session.listCalendars();
        loaded.sessions.set(account.id, session);
        for (const calendar of calendars) {
          const found = {
            accountId: account.id,
            url: calendar.url,
            name: calendar.displayName,
          };
          loaded.calendars.push({
            ...found,
            key: `c${String(loaded.calendars.length + 1)}`,
            address: account.address,
            isDefault: calendar.isDefault,
            shared: calendar.shared,
            canWrite: this.#policy(found).canWrite,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Calendar login failed", message);
        loaded.unavailable.push({ address: account.address, error: message });
      }
    }
    return loaded;
  }

  /** Logs in on the first call; a later call gives the same calendars. */
  load(): Promise<Loaded> {
    this.#loaded ??= this.#load();
    return this.#loaded;
  }

  async calendar(key: string): Promise<RunCalendar> {
    const { calendars } = await this.load();
    const found = calendars.find((calendar) => calendar.key === key);
    if (!found) {
      throw new ToolRefusal(
        `Unknown calendar "${key}". Use a key that list_calendars gives.`,
      );
    }
    return found;
  }

  /** The default calendar of the first account that names one. */
  async defaultCalendar(): Promise<RunCalendar> {
    const { calendars } = await this.load();
    const found = calendars.find((calendar) => calendar.isDefault);
    if (!found) {
      throw new ToolRefusal(
        "No calendar is the default. Name one from list_calendars.",
      );
    }
    return found;
  }

  async session(calendar: RunCalendar): Promise<CalendarSession> {
    const session = (await this.load()).sessions.get(calendar.accountId);
    if (!session)
      throw new ToolRefusal(`Calendar ${calendar.key} is not open.`);
    return session;
  }
}
