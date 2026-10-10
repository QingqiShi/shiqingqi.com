import { useReplica } from "../replica/use-replica.ts";

/** The Household's base currency: every total is in it. */
export function useBaseCurrency(): string {
  return useReplica((snapshot) => snapshot.household?.baseCurrency ?? "GBP");
}
