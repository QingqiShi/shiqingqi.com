import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import {
  mailAccounts,
  mailCategories,
  mailFolders,
} from "#src/assistant/db/schema.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { resolveMailboxAuth } from "#src/assistant/mail/accounts/resolve-mailbox-auth.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import { MAIL_SERVERS } from "#src/assistant/mail/imap/mail-servers.ts";
import { parseMail } from "#src/assistant/mail/parse/parse-mail.ts";
import { FETCH_MAX_BYTES } from "#src/assistant/mail/sync/sync-account.ts";
import { classifyMail } from "./classify-mail.ts";
import { readClassifyContext } from "./classify-queued-mail.ts";
import { meterClassifierModel } from "./eval/meter-classifier-model.ts";

/**
 * Scores the classifier against mail that the user already filed: the
 * newest mail of each folder that is mapped to a category should get that
 * category. It reads the mailboxes read-only and writes nothing, but it
 * sends real mail to the model. Run it from `apps/assistant` as
 *
 *   vercel env run -e production -- env ASSISTANT_EVAL_USER_ID=<user id> pnpm eval filed-mail
 *
 * `ASSISTANT_EVAL_PER_FOLDER` sets how many mails of each folder (10).
 */
const userId = process.env.ASSISTANT_EVAL_USER_ID;
const perFolder = Number(process.env.ASSISTANT_EVAL_PER_FOLDER ?? 10);
const LOOK_BACK_MS = 365 * 24 * 60 * 60 * 1000;

describe.skipIf(!userId)("Classification of filed mail (real model)", () => {
  it(
    "gives filed mail the category of its folder",
    { timeout: 30 * 60 * 1000 },
    async () => {
      if (!userId) return;
      const db = getAssistantDb();
      const deps = getMailDeps();
      if (!deps) throw new Error("ASSISTANT_CREDENTIAL_KEY is not set");
      const meter = meterClassifierModel();
      const { accounts, folders, context } = await withUser(
        db,
        userId,
        async (scope) => ({
          accounts: await scope.db.select().from(mailAccounts),
          folders: await scope.db
            .select({
              accountId: mailFolders.accountId,
              path: mailFolders.path,
              category: mailCategories.name,
            })
            .from(mailFolders)
            .innerJoin(
              mailCategories,
              eq(mailCategories.id, mailFolders.categoryId),
            ),
          context: await readClassifyContext(scope),
        }),
      );
      const nameOf = new Map(
        context.categories.map((category) => [category.id, category.name]),
      );
      const tally = new Map<string, { right: number; total: number }>();
      const buckets = new Map<string, number>();
      const misses: string[] = [];

      for (const account of accounts) {
        const auth = await resolveMailboxAuth(db, userId, account, deps.auth);
        const session = await deps.connector(
          MAIL_SERVERS[account.provider],
          auth,
        );
        try {
          for (const folder of folders.filter(
            (row) => row.accountId === account.id,
          )) {
            await session.openFolder(folder.path);
            const uids = await session.listUidsSince(
              new Date(Date.now() - LOOK_BACK_MS),
            );
            const fetched = await session.fetchMessages(
              uids.slice(-perFolder),
              FETCH_MAX_BYTES,
            );
            for (const message of fetched) {
              const mail = await parseMail(message);
              const result = await classifyMail(
                mail,
                { ...context, senderRules: [], knownCorrespondent: false },
                meter.model,
              );
              if (!result) continue;
              const got = nameOf.get(result.categoryId ?? "") ?? "-";
              const score = tally.get(folder.category) ?? {
                right: 0,
                total: 0,
              };
              score.total += 1;
              if (got === folder.category) score.right += 1;
              else
                misses.push(`  ${folder.category} → ${got}: ${mail.subject}`);
              tally.set(folder.category, score);
              buckets.set(result.bucket, (buckets.get(result.bucket) ?? 0) + 1);
            }
          }
        } finally {
          await session.close();
        }
      }

      const total = [...tally.values()].reduce(
        (sum, score) => ({
          right: sum.right + score.right,
          total: sum.total + score.total,
        }),
        { right: 0, total: 0 },
      );
      console.log(
        [
          `Filed mail: category ${String(total.right)}/${String(total.total)}`,
          ...[...tally].map(
            ([name, score]) =>
              `  ${name}: ${String(score.right)}/${String(score.total)}`,
          ),
          `Buckets: ${[...buckets].map(([bucket, count]) => `${bucket} ${String(count)}`).join(", ")}`,
          "Misses:",
          ...misses,
          meter.summary(),
        ].join("\n"),
      );
      expect(total.total).toBeGreaterThan(0);
    },
  );
});
