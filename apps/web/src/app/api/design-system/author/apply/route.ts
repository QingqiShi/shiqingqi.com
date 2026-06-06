import { changesetSchema } from "../changeset-schema.ts";
import { blockInProduction } from "../dev-guard.ts";
import { applyEdits } from "../token-file.ts";
import { TokenEditError } from "../token-source-editor.ts";

export const dynamic = "force-dynamic";

const TOKENS_FILE = "packages/ui/src/tokens.stylex.ts";

// The browser panel POSTs the changeset here. Deterministic and synchronous:
// the edits are applied straight to `tokens.stylex.ts` (no agent, no queue) and
// the response reports exactly what was written.
export async function POST(request: Request) {
  const blocked = blockInProduction();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = changesetSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid changeset" }, { status: 400 });
  }

  try {
    const edits = await applyEdits(parsed.data.edits);
    return Response.json({ ok: true, file: TOKENS_FILE, edits });
  } catch (error) {
    // A token whose source value couldn't be located is the caller's problem
    // (unprocessable); anything else is a write failure.
    if (error instanceof TokenEditError) {
      return Response.json(
        { ok: false, error: error.message, failedPath: error.token },
        { status: 422 },
      );
    }
    return Response.json(
      { ok: false, error: "Failed to write tokens." },
      { status: 500 },
    );
  }
}
