import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import {
  mailAccounts,
  mailCategories,
  mailClassifications,
  mailMessages,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/with-user.ts";
import { openOriginalHref } from "#src/assistant/digest/open-original-href.ts";

export const SEARCH_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

function likePattern(text: string) {
  return `%${text.replaceAll(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

/**
 * The stored mail, live and history, whose sender or subject holds `query`,
 * in the category `categoryId` when it is set; newest first.
 */
export async function searchMail(
  { db }: UserScope,
  { query, categoryId }: { query: string; categoryId: string | null },
) {
  const text = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (text === "" && !categoryId) return [];
  const filters: (SQL | undefined)[] = [];
  if (text !== "") {
    const pattern = likePattern(text);
    filters.push(
      or(
        ilike(mailMessages.fromAddress, pattern),
        ilike(mailMessages.fromName, pattern),
        ilike(mailMessages.subject, pattern),
      ),
    );
  }
  if (categoryId) filters.push(eq(mailClassifications.categoryId, categoryId));
  const rows = await db
    .select({
      id: mailMessages.id,
      messageId: mailMessages.messageId,
      fromName: mailMessages.fromName,
      fromAddress: mailMessages.fromAddress,
      subject: mailMessages.subject,
      receivedAt: mailMessages.receivedAt,
      origin: mailMessages.origin,
      bucket: mailClassifications.bucket,
      category: mailCategories.name,
      provider: mailAccounts.provider,
      accountAddress: mailAccounts.address,
    })
    .from(mailMessages)
    .innerJoin(mailAccounts, eq(mailAccounts.id, mailMessages.accountId))
    .leftJoin(
      mailClassifications,
      eq(mailClassifications.messageId, mailMessages.id),
    )
    .leftJoin(
      mailCategories,
      eq(mailCategories.id, mailClassifications.categoryId),
    )
    .where(and(...filters))
    .orderBy(desc(mailMessages.receivedAt))
    .limit(SEARCH_LIMIT);
  return rows.map(({ provider, accountAddress, ...row }) => ({
    ...row,
    href: openOriginalHref({
      provider,
      accountAddress,
      messageId: row.messageId,
      fromAddress: row.fromAddress,
      subject: row.subject,
    }),
  }));
}

export type FoundMail = Awaited<ReturnType<typeof searchMail>>[number];
