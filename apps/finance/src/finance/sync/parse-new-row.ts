import { z } from "zod";
import { MutationError } from "./mutation-error.ts";

/** The fields of a row an upsert creates, checked against what a new row needs. */
export function parseNewRow<Schema extends z.ZodType>(
  schema: Schema,
  fields: unknown,
): z.infer<Schema> {
  const parsed = schema.safeParse(fields);
  if (!parsed.success) {
    throw new MutationError("invalid", z.prettifyError(parsed.error));
  }
  return parsed.data;
}
