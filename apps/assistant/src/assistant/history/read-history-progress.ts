import { asc, eq, sql } from "drizzle-orm";
import {
  mailAccounts,
  mailCategories,
  mailClassifications,
  mailFolders,
  mailHistoryBatches,
  mailHistoryJobs,
  mailMessages,
  userSettings,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/with-user.ts";
import { costOf, estimateHistoryCost } from "./estimate-history-cost.ts";
import { MAX_HISTORY_FAILURES } from "./history-batches.ts";
import {
  compareHistoryOrder,
  historyModeOf,
  type HistoryMode,
} from "./history-mode-of.ts";

export interface FolderProgress {
  id: string;
  path: string;
  mode: HistoryMode;
  category: string | null;
  /** The server's count when sync last listed the folders. */
  messageCount: number | null;
  stored: number;
  classified: number;
  queued: number;
  inBatch: number;
  failed: number;
  started: boolean;
  done: boolean;
}

const count = (condition: ReturnType<typeof sql>) =>
  sql<number>`(count(*) filter (where ${condition}))::int`;

/** The history page: the switch, each folder's counts, what was spent, and a guess of what is left to spend. */
export async function readHistoryProgress({ db }: UserScope) {
  const enabled =
    (await db.select({ on: userSettings.historyImport }).from(userSettings)).at(
      0,
    )?.on ?? false;
  const accounts = await db
    .select({
      id: mailAccounts.id,
      provider: mailAccounts.provider,
      address: mailAccounts.address,
    })
    .from(mailAccounts)
    .orderBy(asc(mailAccounts.createdAt));
  const folders = await db
    .select({
      id: mailFolders.id,
      accountId: mailFolders.accountId,
      path: mailFolders.path,
      specialUse: mailFolders.specialUse,
      categoryId: mailFolders.categoryId,
      category: mailCategories.name,
      messageCount: mailFolders.messageCount,
      historyNextUid: mailFolders.historyNextUid,
      historyDoneAt: mailFolders.historyDoneAt,
    })
    .from(mailFolders)
    .leftJoin(mailCategories, eq(mailCategories.id, mailFolders.categoryId));
  const counts = await db
    .select({
      folderId: mailMessages.folderId,
      stored: sql<number>`count(*)::int`,
      classified: count(sql`${mailClassifications.id} is not null`),
      queued: count(
        sql`${mailHistoryJobs.messageId} is not null and ${mailHistoryJobs.batchId} is null and ${mailHistoryJobs.failures} < ${MAX_HISTORY_FAILURES}`,
      ),
      inBatch: count(sql`${mailHistoryJobs.batchId} is not null`),
      failed: count(
        sql`${mailHistoryJobs.batchId} is null and ${mailHistoryJobs.failures} >= ${MAX_HISTORY_FAILURES}`,
      ),
    })
    .from(mailMessages)
    .leftJoin(
      mailClassifications,
      eq(mailClassifications.messageId, mailMessages.id),
    )
    .leftJoin(mailHistoryJobs, eq(mailHistoryJobs.messageId, mailMessages.id))
    .where(eq(mailMessages.origin, "history"))
    .groupBy(mailMessages.folderId);
  const [usage] = await db
    .select({
      input: sql<number>`coalesce(sum(${mailHistoryBatches.inputTokens}), 0)::float8`,
      output: sql<number>`coalesce(sum(${mailHistoryBatches.outputTokens}), 0)::float8`,
      cacheRead: sql<number>`coalesce(sum(${mailHistoryBatches.cacheReadTokens}), 0)::float8`,
      cacheWrite: sql<number>`coalesce(sum(${mailHistoryBatches.cacheWriteTokens}), 0)::float8`,
    })
    .from(mailHistoryBatches);

  const byFolder = new Map(counts.map((row) => [row.folderId, row]));
  const progress = accounts.map((account) => ({
    ...account,
    folders: folders
      .filter((folder) => folder.accountId === account.id)
      .map((folder): FolderProgress => {
        const row = byFolder.get(folder.id);
        return {
          id: folder.id,
          path: folder.path,
          mode: historyModeOf(folder),
          category: folder.category,
          messageCount: folder.messageCount,
          stored: row?.stored ?? 0,
          classified: row?.classified ?? 0,
          queued: row?.queued ?? 0,
          inBatch: row?.inBatch ?? 0,
          failed: row?.failed ?? 0,
          started: folder.historyNextUid !== null,
          done: folder.historyDoneAt !== null,
        };
      })
      .sort(compareHistoryOrder),
  }));
  const everyFolder = progress.flatMap((account) => account.folders);
  // The server's counts also hold mail that the walk finds stored already, so this guess is high.
  const unstored = everyFolder
    .filter((folder) => folder.mode === "classify" && !folder.done)
    .reduce(
      (sum, folder) =>
        sum + Math.max((folder.messageCount ?? 0) - folder.stored, 0),
      0,
    );
  const mailsToClassify =
    unstored + everyFolder.reduce((sum, folder) => sum + folder.queued, 0);
  return {
    enabled,
    accounts: progress,
    spent: costOf(usage),
    mailsToClassify,
    estimate: estimateHistoryCost(mailsToClassify),
  };
}

export type HistoryProgress = Awaited<ReturnType<typeof readHistoryProgress>>;
