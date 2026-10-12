import { useEffect, useState } from "react";
import { bankApiClient } from "../bank/bank-api-client.ts";
import { useReplica } from "../replica/use-replica.ts";

type UnbackedEntries =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "ready"; entryIds: readonly string[] };

/**
 * The ids of the Entries behind a Bank link's balance difference, read from
 * the server, which holds the bank rows. It reads them again when
 * `readKey` changes, once the server has every local mutation.
 */
export function useUnbackedEntries(
  linkId: string,
  readKey: string,
): UnbackedEntries {
  const [result, setResult] = useState<{
    key: string;
    entries: UnbackedEntries;
  } | null>(null);
  const outboxEmpty = useReplica((snapshot) => snapshot.outboxCount === 0);
  const key = `${linkId}:${readKey}`;

  useEffect(() => {
    if (result?.key === key) return;
    // Wait for the push. A read before the push of an Undo does not include the restored Entry.
    if (result !== null && !outboxEmpty) return;
    const controller = new AbortController();
    const settle = (entries: UnbackedEntries) => {
      if (!controller.signal.aborted) setResult({ key, entries });
    };
    bankApiClient.listUnbackedEntries(linkId, controller.signal).then(
      ({ entryIds }) => {
        settle({ state: "ready", entryIds });
      },
      () => {
        settle({ state: "failed" });
      },
    );
    return () => {
      controller.abort();
    };
  }, [linkId, key, outboxEmpty, result]);

  if (result === null) return { state: "loading" };
  // Keep the last list while the next read runs, so the rows do not blink.
  if (result.key !== key && result.entries.state !== "ready") {
    return { state: "loading" };
  }
  return result.entries;
}
