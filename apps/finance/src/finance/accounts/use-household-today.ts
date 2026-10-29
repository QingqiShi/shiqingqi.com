import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { useReplica } from "../replica/use-replica.ts";

/** Today in the Household's timezone, as `YYYY-MM-DD`. */
export function useHouseholdToday(): string {
  const timeZone = useReplica(
    (snapshot) => snapshot.household?.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
  );
  return todayInTimeZone(timeZone);
}
