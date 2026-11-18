import { expect, it } from "vitest";
import { z } from "zod";
import { draftOpSchema, itemSchemas } from "#src/trips/ops/op-schema.ts";
import { tripPrompts } from "./trip-prompts.ts";

const OPS = tripPrompts.ops;

interface FieldName {
  name: string;
  depth: number;
}

/** Each field name in a schema, also of the objects inside it, such as a flight's `from`. */
function fieldNames(schema: z.core.$ZodType, depth = 0): FieldName[] {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return fieldNames(schema.unwrap(), depth);
  }
  if (schema instanceof z.ZodArray) return fieldNames(schema.element, depth);
  if (!(schema instanceof z.ZodObject)) return [];
  return Object.entries<z.core.$ZodType>(schema.shape).flatMap(
    ([name, field]) => [{ name, depth }, ...fieldNames(field, depth + 1)],
  );
}

function lineOf(start: string): string {
  const line = OPS.split("\n").find((each) => each.startsWith(start));
  if (line === undefined) throw new Error(`The ops reference has no ${start}`);
  return line;
}

/** The names of an op or a kind are on its own line; those deeper in, such as the fields of a highlight, can be explained on another. */
function missing(line: string, names: readonly FieldName[]): string[] {
  return names
    .filter(
      ({ name, depth }) =>
        !new RegExp(`\\b${name}\\b`).test(depth < 2 ? line : OPS),
    )
    .map(({ name }) => name);
}

it("names every op, item kind and field that the ops layer accepts", () => {
  const gaps: string[] = [];
  for (const option of draftOpSchema.options) {
    const kind = option.shape.op.value;
    const names = fieldNames(option).filter(({ name }) => name !== "op");
    gaps.push(
      ...missing(lineOf(`- {"op":"${kind}"`), names).map(
        (name) => `${kind}.${name}`,
      ),
    );
  }
  for (const [kind, schema] of Object.entries(itemSchemas)) {
    const names = fieldNames(schema).filter(
      ({ name }) => name !== "type" && name !== "id",
    );
    gaps.push(
      ...missing(lineOf(`- ${kind}`), names).map((name) => `${kind}.${name}`),
    );
  }
  expect(gaps).toEqual([]);
});
