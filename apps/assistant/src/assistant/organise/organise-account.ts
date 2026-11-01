import { generateText, Output } from "ai";
import type { AssistantModel } from "#src/assistant/ai/get-organise-model.ts";
import { mailAccounts, type UserLocale } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  recordAccountError,
  recordAccountOk,
} from "#src/assistant/mail/accounts/check-account.ts";
import {
  openMailboxSession,
  type MailboxDeps,
} from "#src/assistant/mail/accounts/open-mailbox-session.ts";
import { ownAccount } from "#src/assistant/mail/accounts/own-account.ts";
import type { StoredAccount } from "#src/assistant/mail/accounts/resolve-mailbox-auth.ts";
import { MoveUnsupportedError } from "#src/assistant/mail/imap/move-unsupported-error.ts";
import type {
  MailboxFolder,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";
import {
  parseMailSafely,
  type ParsedMail,
} from "#src/assistant/mail/parse/parse-mail.ts";
import {
  candidateFolders,
  delimiterOf,
  findFolderNamed,
  isInbox,
  newFolderName,
} from "./candidate-folders.ts";
import {
  organisePrompt,
  type OrganiseContext,
  type OrganiseOutput,
} from "./organise-prompt.ts";

/** The first bytes of each mail: the headers and the start of the text. */
const FETCH_MAX_BYTES = 16 * 1024;
const PAGE_SIZE = 20;
const MODEL_CONCURRENCY = 4;
const MAX_NEW_FOLDERS_PER_RUN = 3;
const MAX_OUTPUT_TOKENS = 1000;

export interface OrganiseDeps extends MailboxDeps {
  model: AssistantModel;
}

export interface OrganiseSettings {
  notes: string;
  locale: UserLocale;
}

export interface OrganiseAccountResult {
  ok: boolean;
  moved: number;
  createdFolders: number;
  /** Mail this run read and left in the inbox, for the next run. */
  left: number;
  /** Mail this run did not reach before its time ran out. */
  remaining: number;
}

type Choice = OrganiseOutput["target"] | null;

/** What `mail_accounts.write_error_code` can hold. */
export type WriteErrorCode = "move_unsupported";

async function chooseFolder(
  model: AssistantModel,
  mail: ParsedMail,
  context: OrganiseContext,
): Promise<OrganiseOutput["target"]> {
  const result = await generateText({
    model: model.model,
    output: Output.object({
      schema: organisePrompt.outputSchema(context.allowNewFolder),
    }),
    reasoning: "low",
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    instructions: organisePrompt.instructions(context),
    messages: [{ role: "user", content: organisePrompt.describeMail(mail) }],
  });
  return result.output.target;
}

/** Runs `task` on each item, at most `limit` at a time, and keeps the order. */
async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

/** The folders of one run: the server's list, and the folders the run made. */
class RunFolders {
  readonly all: MailboxFolder[];
  readonly candidates: string[];
  readonly session: MailboxSession;
  created = 0;

  constructor(listed: readonly MailboxFolder[], session: MailboxSession) {
    this.all = [...listed];
    this.candidates = candidateFolders(listed);
    this.session = session;
  }

  get mayCreate() {
    return this.created < MAX_NEW_FOLDERS_PER_RUN;
  }

  /** The path that a choice names, or null to leave the mail in the inbox. */
  async targetOf(choice: Choice): Promise<string | null> {
    if (!choice) return null;
    if ("folder" in choice) {
      return this.candidates.includes(choice.folder) ? choice.folder : null;
    }
    const name = newFolderName(choice.newFolder, delimiterOf(this.all));
    if (!name) return null;
    const existing = findFolderNamed(name, this.all);
    if (existing) {
      return this.candidates.includes(existing.path) ? existing.path : null;
    }
    if (!this.mayCreate) return null;
    try {
      await this.session.createFolder(name);
    } catch (error) {
      console.error(
        "Folder not made",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
    this.created += 1;
    this.all.push({
      path: name,
      name,
      delimiter: delimiterOf(this.all),
      specialUse: null,
      selectable: true,
    });
    this.candidates.push(name);
    return name;
  }
}

async function recordWriteState(
  db: AssistantDb,
  userId: string,
  accountId: string,
  error: MoveUnsupportedError | null,
  now: Date,
) {
  await db
    .update(mailAccounts)
    .set(
      error
        ? {
            writeErrorCode: "move_unsupported" satisfies WriteErrorCode,
            writeErrorMessage: error.message,
            writeErrorAt: now,
          }
        : {
            writeErrorCode: null,
            writeErrorMessage: null,
            writeErrorAt: null,
          },
    )
    .where(ownAccount(userId, accountId));
}

/**
 * Files the inbox mail of one account, oldest first, page by page until
 * `endsAt`: the model picks a folder for each mail, or a new folder, and the
 * mail is marked read and moved there with MOVE. Mail that the model gives
 * no usable folder for stays in the inbox for the next run. It never copies,
 * never deletes, and stores nothing of a mail.
 */
export async function organiseAccount(
  {
    db,
    userId,
    account,
    settings,
    endsAt,
  }: {
    db: AssistantDb;
    userId: string;
    account: StoredAccount;
    settings: OrganiseSettings;
    endsAt: number;
  },
  deps: OrganiseDeps,
): Promise<OrganiseAccountResult> {
  const now = deps.auth.now;
  const result: OrganiseAccountResult = {
    ok: true,
    moved: 0,
    createdFolders: 0,
    left: 0,
    remaining: 0,
  };
  let session: MailboxSession | null = null;
  try {
    session = await openMailboxSession(db, userId, account, deps);
    if (!session.supportsMove()) throw new MoveUnsupportedError();
    const listed = await session.listFolders();
    const inbox = listed.find(isInbox);
    if (inbox) {
      const folders = new RunFolders(listed, session);
      await session.openFolder(inbox.path, { write: true });
      const uids = await session.listUidsAfter(0);
      for (let start = 0; start < uids.length; start += PAGE_SIZE) {
        if (now().getTime() >= endsAt) {
          result.remaining = uids.length - start;
          break;
        }
        const page = uids.slice(start, start + PAGE_SIZE);
        const mails = await Promise.all(
          (await session.fetchMessages(page, FETCH_MAX_BYTES)).map(
            parseMailSafely,
          ),
        );
        const context: OrganiseContext = {
          folders: [...folders.candidates],
          notes: settings.notes,
          locale: settings.locale,
          allowNewFolder: folders.mayCreate,
        };
        const choices = await mapLimited(mails, MODEL_CONCURRENCY, (mail) =>
          chooseFolder(deps.model, mail, context).catch((error: unknown) => {
            console.error(
              "No folder chosen",
              error instanceof Error ? error.message : error,
            );
            return null;
          }),
        );
        const byTarget = new Map<string, number[]>();
        for (const [index, mail] of mails.entries()) {
          const target = await folders.targetOf(choices[index]);
          if (target === null) {
            result.left += 1;
            continue;
          }
          byTarget.set(target, [...(byTarget.get(target) ?? []), mail.uid]);
        }
        for (const [target, moving] of byTarget) {
          await session.addFlags(moving, ["\\Seen"]);
          await session.moveMessages(moving, target);
          result.moved += moving.length;
        }
        result.createdFolders = folders.created;
      }
    }
    await recordWriteState(db, userId, account.id, null, now());
    await recordAccountOk(db, userId, account.id, now());
  } catch (error) {
    result.ok = false;
    if (error instanceof MoveUnsupportedError) {
      await recordWriteState(db, userId, account.id, error, now());
      await recordAccountOk(db, userId, account.id, now());
    } else {
      await recordAccountError(db, userId, account.id, error, now());
    }
  } finally {
    await session?.close().catch(() => undefined);
  }
  console.info("Mailbox organised", account.id, {
    ok: result.ok,
    moved: result.moved,
    createdFolders: result.createdFolders,
    left: result.left,
    remaining: result.remaining,
  });
  return result;
}
