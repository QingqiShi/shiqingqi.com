import { z } from "zod";
import type { Changeset } from "#src/app/api/design-system/author/changeset-schema.ts";

const BASE = "/api/design-system/author";

const appliedEditSchema = z.object({
  path: z.string(),
  value: z.string(),
  theme: z.enum(["light", "dark"]).nullable(),
  drift: z.string().nullable(),
});

const applyResultSchema = z.object({
  ok: z.literal(true),
  file: z.string(),
  edits: z.array(appliedEditSchema),
});

const applyErrorSchema = z.object({
  error: z.string().optional(),
  failedPath: z.string().optional(),
});

export type AppliedEdit = z.infer<typeof appliedEditSchema>;

export type ApplyOutcome =
  | { ok: true; file: string; edits: AppliedEdit[] }
  | { ok: false; status: number; error?: string; failedPath?: string };

export async function submitChangeset(
  changeset: Changeset,
): Promise<ApplyOutcome> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changeset),
    });
  } catch {
    // Dev server unreachable (e.g. mid-HMR restart) or a network drop. Degrade
    // instead of throwing so the panel never wedges on an unhandled rejection.
    // status 0 = transport failure.
    return { ok: false, status: 0 };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: response.status };
  }

  if (response.ok) {
    const parsed = applyResultSchema.safeParse(body);
    return parsed.success
      ? parsed.data
      : { ok: false, status: response.status };
  }

  const parsed = applyErrorSchema.safeParse(body);
  return {
    ok: false,
    status: response.status,
    ...(parsed.success ? parsed.data : {}),
  };
}
