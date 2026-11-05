import { sql } from "drizzle-orm";
import { todos, type TodoEditableField } from "#src/assistant/db/schema.ts";

/** `owner_edited_fields` with these fields added. */
export function withOwnerFields(fields: readonly TodoEditableField[]) {
  const names = sql.join(
    fields.map((field) => sql`${field}`),
    sql`, `,
  );
  return sql<
    TodoEditableField[]
  >`array(select distinct unnest(${todos.ownerEditedFields} || array[${names}]::text[]))`;
}

/** The fields with this one in them or out of them. */
export function withOwnerField(
  fields: readonly TodoEditableField[],
  field: TodoEditableField,
  ownerSet: boolean,
) {
  const others = fields.filter((other) => other !== field);
  return ownerSet ? [...others, field] : others;
}
