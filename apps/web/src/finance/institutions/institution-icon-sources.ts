import "server-only";
import { getInstitutionDomainModel } from "../ai/get-finance-model.ts";
import { guessInstitutionDomain } from "../ai/guess-institution-domain.ts";
import { getFinanceDb } from "../db/get-finance-db.ts";
import { fetchInstitutionIcon } from "./fetch-institution-icon.ts";
import {
  refreshInstitutionIcons,
  type RefreshInstitutionIconsDependencies,
} from "./refresh-institution-icons.ts";

/** Below the sync route's `maxDuration` of 180 s, with time left to write the guesses. */
const AFTER_PUSH_BUDGET_MS = 120_000;

/** The model and the web behind institution icons. Without a model key, names are not guessed. */
export function institutionIconSources(): Pick<
  RefreshInstitutionIconsDependencies,
  "guessDomain" | "fetchIcon"
> {
  const model = getInstitutionDomainModel();
  return {
    guessDomain: model
      ? (name, hints, signal) =>
          guessInstitutionDomain(model, name, hints, signal)
      : undefined,
    fetchIcon: (domain, signal) => fetchInstitutionIcon(domain, { signal }),
  };
}

/** Refreshes one Household's institution icons after a response; a failure is only logged, as the daily cron tries again. */
export async function refreshInstitutionIconsAfterPush(householdId: string) {
  try {
    await refreshInstitutionIcons(getFinanceDb(), householdId, {
      ...institutionIconSources(),
      now: () => new Date(),
      endsAt: Date.now() + AFTER_PUSH_BUDGET_MS,
    });
  } catch (error) {
    console.error("Institution icons failed after a push", error);
  }
}
