import type { SyncNowResponse } from "../bank/types.ts";

/** What "Sync now" did to one Bank link's account. */
export interface BankSyncLine {
  accountId: string;
  name: string;
  created: number;
  /** Bank rows matched to a recorded or an Expected transaction. */
  matched: number;
  /** The account's transactions that wait in Review after the sync. */
  review: number;
  failed: boolean;
}

/** One line per Bank link that brought something in, failed, or left rows to review. */
export function summariseBankSync(
  response: SyncNowResponse,
  nameOf: (accountId: string) => string,
  reviewCountOf: (accountId: string) => number,
): BankSyncLine[] {
  return response.links
    .map((link) => ({
      accountId: link.accountId,
      name: nameOf(link.accountId),
      created: link.created,
      matched: link.linked + link.confirmed,
      review: reviewCountOf(link.accountId),
      failed: link.error !== null,
    }))
    .filter(
      (line) =>
        line.failed || line.created > 0 || line.matched > 0 || line.review > 0,
    );
}
