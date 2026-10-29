import { nameBasedUuid } from "../ids/name-based-uuid.ts";

/** The id of a Rule's Transaction on a day; the same occurrence always gets the same id. */
export function occurrenceId(ruleId: string, day: string) {
  return nameBasedUuid(`rule:${ruleId}:${day}`);
}

/** The id of the Entry at `position` of a Rule's Transaction on a day. */
export function occurrenceEntryId(
  ruleId: string,
  day: string,
  position: number,
) {
  return nameBasedUuid(`rule:${ruleId}:${day}:${String(position)}`);
}
