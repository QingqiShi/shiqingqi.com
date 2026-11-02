import { and, eq, ne, sql } from "drizzle-orm";
import { mailAccounts, type MailProvider } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  recordAccountError,
  recordAccountOk,
} from "#src/assistant/mail/accounts/check-account.ts";
import {
  openMailboxSession,
  storedCredential,
  type MailboxDeps,
} from "#src/assistant/mail/accounts/open-mailbox-session.ts";
import { recordWriteState } from "#src/assistant/mail/accounts/record-write-state.ts";
import type { StoredAccount } from "#src/assistant/mail/accounts/resolve-mailbox-auth.ts";
import { MoveUnsupportedError } from "#src/assistant/mail/imap/move-unsupported-error.ts";
import type {
  MailboxFolder,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";
import { ToolRefusal } from "../agent-tool.ts";

/** A mailbox as the model knows it: by a short key such as `a1`. */
export interface RunAccount {
  key: string;
  id: string;
  provider: MailProvider;
  address: string;
}

/** One logged-in account while a tool holds it. */
export interface HeldMailbox {
  account: RunAccount;
  session: MailboxSession;
  folders: readonly MailboxFolder[];
  /** The folder at `path`; a refusal when the account has none. */
  folder(path: string): MailboxFolder;
  /** Opens a folder, for writes when `write` is set, unless it is open already; returns its UIDVALIDITY. */
  select(path: string, write: boolean): Promise<number>;
  /** Reads the folder list again after a tool made, renamed or deleted a folder, and opens the next folder anew. */
  refreshFolders(): Promise<void>;
}

interface AccountState {
  account: RunAccount;
  stored: StoredAccount;
  session: MailboxSession;
  folders: MailboxFolder[];
  open: { path: string; write: boolean; uidValidity: number } | null;
  /** Each tool call waits for the one before it: an IMAP session has one open folder. */
  queue: Promise<unknown>;
  /** The first error of the mail server in this run. */
  failure: unknown;
}

/**
 * The mailboxes of one user for one agent run. It opens only the user's own
 * accounts that do not wait for a new connect, keeps each session for the
 * whole run, and records at the end whether each account worked.
 */
export class RunMailboxes {
  readonly #db: AssistantDb;
  readonly #userId: string;
  readonly #deps: MailboxDeps;
  readonly #states: Map<string, AccountState>;
  /** Accounts that did not open: their errors are recorded already. */
  readonly failedAccounts: number;

  private constructor(
    db: AssistantDb,
    userId: string,
    deps: MailboxDeps,
    states: AccountState[],
    failedAccounts: number,
  ) {
    this.#db = db;
    this.#userId = userId;
    this.#deps = deps;
    this.#states = new Map(states.map((state) => [state.account.key, state]));
    this.failedAccounts = failedAccounts;
  }

  /**
   * Logs in to each account and reads its folders. An account that fails
   * gets its error recorded; one whose server has no MOVE gets
   * `move_unsupported`. Neither takes part in the run.
   */
  static async open(
    db: AssistantDb,
    userId: string,
    deps: MailboxDeps,
  ): Promise<RunMailboxes> {
    const now = deps.auth.now;
    const stored = await db
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
          ne(mailAccounts.status, "reconnect"),
        ),
      )
      .orderBy(sql`${mailAccounts.lastSyncedAt} asc nulls first`);
    const opened = await Promise.all(
      stored.map(async (account, index): Promise<AccountState | null> => {
        let session: MailboxSession | null = null;
        try {
          session = await openMailboxSession(db, userId, account, deps);
          if (!session.supportsMove()) throw new MoveUnsupportedError();
          const folders = await session.listFolders();
          return {
            account: {
              key: `a${String(index + 1)}`,
              id: account.id,
              provider: account.provider,
              address: account.address,
            },
            stored: account,
            session,
            folders,
            open: null,
            queue: Promise.resolve(),
            failure: null,
          };
        } catch (error) {
          await session?.close().catch(() => undefined);
          if (error instanceof MoveUnsupportedError) {
            await recordWriteState(db, userId, account.id, error, now());
            await recordAccountOk(db, userId, account.id, now());
          } else {
            await recordAccountError(db, userId, account.id, error, now());
          }
          return null;
        }
      }),
    );
    const states = opened.filter((state) => state !== null);
    return new RunMailboxes(
      db,
      userId,
      deps,
      states,
      stored.length - states.length,
    );
  }

  get accounts(): RunAccount[] {
    return [...this.#states.values()].map((state) => state.account);
  }

  #state(key: string): AccountState {
    const state = this.#states.get(key);
    if (!state) {
      throw new ToolRefusal(
        `Unknown account "${key}". Use a key that list_accounts gives.`,
      );
    }
    return state;
  }

  /**
   * Runs `task` with the account's session, after the tasks before it on
   * the same account. A session that the server closed is opened again. A
   * server error is kept for the account's status and thrown on.
   */
  use<T>(key: string, task: (mailbox: HeldMailbox) => Promise<T>): Promise<T> {
    const state = this.#state(key);
    const run = state.queue.then(async () => {
      try {
        if (!state.session.isUsable()) {
          await state.session.close().catch(() => undefined);
          // A login earlier in the run can store a new refresh token. Read it again.
          state.stored = {
            ...state.stored,
            credential: await storedCredential(
              this.#db,
              this.#userId,
              state.account.id,
            ),
          };
          state.session = await openMailboxSession(
            this.#db,
            this.#userId,
            state.stored,
            this.#deps,
          );
          state.open = null;
        }
        return await task(this.#held(state));
      } catch (error) {
        if (!(error instanceof ToolRefusal)) state.failure ??= error;
        throw error;
      }
    });
    state.queue = run.catch(() => undefined);
    return run;
  }

  #held(state: AccountState): HeldMailbox {
    return {
      account: state.account,
      session: state.session,
      get folders() {
        return state.folders;
      },
      folder: (path) => {
        const found = state.folders.find((folder) => folder.path === path);
        if (!found) {
          throw new ToolRefusal(
            `Account ${state.account.key} has no folder "${path}". Use a path that list_folders gives.`,
          );
        }
        return found;
      },
      select: async (path, write) => {
        if (state.open?.path === path && (state.open.write || !write)) {
          return state.open.uidValidity;
        }
        state.open = null;
        const opened = await state.session.openFolder(path, { write });
        state.open = { path, write, uidValidity: opened.uidValidity };
        return opened.uidValidity;
      },
      refreshFolders: async () => {
        state.open = null;
        state.folders = await state.session.listFolders();
      },
    };
  }

  /** Records whether each account worked in this run, and logs out. */
  async finish() {
    const now = this.#deps.auth.now;
    for (const state of this.#states.values()) {
      await state.queue;
      const { id } = state.account;
      if (state.failure === null) {
        await recordWriteState(this.#db, this.#userId, id, null, now());
        await recordAccountOk(this.#db, this.#userId, id, now());
      } else {
        await recordAccountError(
          this.#db,
          this.#userId,
          id,
          state.failure,
          now(),
        );
      }
      await state.session.close().catch(() => undefined);
    }
  }
}
