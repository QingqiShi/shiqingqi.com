import { presentPersonInputSchema } from "#src/movie-database/chat/tools/present-person-tool.ts";
import type { PersonListItem } from "#src/movie-database/types.ts";

export function resolvePersonItems(
  input: unknown,
  personResults: ReadonlyMap<number, PersonListItem>,
): ReadonlyArray<PersonListItem> {
  const parsed = presentPersonInputSchema.safeParse(input);
  if (!parsed.success) return [];

  const items: PersonListItem[] = [];
  for (const entry of parsed.data.people) {
    const found = personResults.get(entry.id);
    if (found) {
      items.push(found);
    } else {
      items.push({ id: entry.id });
    }
  }
  return items;
}
