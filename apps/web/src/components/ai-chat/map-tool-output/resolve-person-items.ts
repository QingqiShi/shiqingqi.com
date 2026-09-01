import { presentPersonInputSchema } from "#src/ai-chat/tools/create-present-person-tool.ts";
import type { PersonListItem } from "#src/utils/person-list-item.ts";

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
