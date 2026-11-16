import type { z } from "zod";
import { HttpError } from "./http-error.ts";

/** The JSON body of `request` as `schema` reads it. Any other body is `invalid_body`. */
export async function readAuthBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "invalid_body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "invalid_body");
  return parsed.data;
}
