import { useReplica } from "../replica/use-replica.ts";
import { useSystemAccountNames } from "../store/use-account-display-name.ts";
import {
  selectTransactionLookups,
  withSystemAccountLabels,
} from "./select-transaction-lookups.ts";

/** The lookups a Transaction screen reads, with In transit named in the visitor's language. */
export function useTransactionLookups() {
  const lookups = useReplica(selectTransactionLookups);
  return withSystemAccountLabels(lookups, useSystemAccountNames());
}
