import { z } from "zod";
import {
  petDaySchema,
  uploadBodySchema,
} from "../upload/upload-body-schema.ts";

const macSnapshotSchema = uploadBodySchema.extend({
  days: z.array(petDaySchema),
  /** The server time of the upload. */
  receivedAt: z.number(),
});

/** What `buddy:mac:<id>:snapshot` holds: the Mac's newest upload, with every day it ever sent. */
export type MacSnapshot = z.infer<typeof macSnapshotSchema>;

export function parseSnapshot(value: string | null): MacSnapshot | null {
  if (value === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    json = undefined;
  }
  const parsed = macSnapshotSchema.safeParse(json);
  if (parsed.success) return parsed.data;
  console.error(
    "Buddy: a Mac snapshot in Redis does not parse, so it is skipped.",
  );
  return null;
}
