import type { z } from "zod";
import { financeJson } from "./finance-json.ts";

/** The JSON body of `request` parsed by `schema`, or the 400 `invalid-json` or `invalid-body` response. */
export async function readFinanceBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.output<Schema> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return financeJson({ error: "invalid-json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return financeJson({ error: "invalid-body" }, { status: 400 });
  }
  return parsed.data;
}
