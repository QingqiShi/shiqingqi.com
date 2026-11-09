import { careKeys, countersOf } from "../care/care-keys.ts";
import { nextSnapshot } from "../snapshot/next-snapshot.ts";
import { parseSnapshot } from "../snapshot/parse-snapshot.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";
import { authenticateMachine } from "./authenticate-machine.ts";
import { uploadBodySchema } from "./upload-body-schema.ts";
import {
  readUploadHeaders,
  verifyUploadSignature,
} from "./verify-upload-signature.ts";

export const MAX_UPLOAD_BYTES = 512 * 1024;
export const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

// Content-Length can be false, so count the bytes.
async function readBodyWithCap(request: Request, limit: number) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function parseJson(body: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return undefined;
  }
}

const unauthorized = () =>
  Response.json({ error: "unauthorized" }, { status: 401 });

/**
 * Stores a signed upload in two Redis commands, a GET of the Mac's key and
 * snapshot and the page's visitor counts, and a SET of the new snapshot. It
 * never reads Postgres, so a request without a key cannot wake the database.
 * The reply carries the visitor counts, so that the Mac shows them.
 */
export async function handleUpload(
  request: Request,
  user: string,
  { kv, secret, now }: { kv: BuddyKv; secret: string; now: () => number },
): Promise<Response> {
  const body = await readBodyWithCap(request, MAX_UPLOAD_BYTES);
  if (!body) return Response.json({ error: "too large" }, { status: 413 });

  const signed = readUploadHeaders(request.headers);
  if (!signed) return unauthorized();
  const { machine, signature } = signed;
  const [sealedKey, storedSnapshot, fed, patted] = await kv.getMany([
    buddyKeys.macKey(machine),
    buddyKeys.macSnapshot(machine),
    ...careKeys(user),
  ]);
  const key = authenticateMachine({ sealedKey, secret, machine, user });
  if (
    key === null ||
    !verifyUploadSignature({
      user,
      machine,
      signature,
      body,
      publicKey: key.publicKey,
    })
  ) {
    return unauthorized();
  }

  const parsed = uploadBodySchema.safeParse(parseJson(body));
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const upload = parsed.data;
  const receivedAt = now();
  const previous = parseSnapshot(storedSnapshot ?? null);
  if (
    Math.abs(receivedAt - upload.at) > MAX_CLOCK_SKEW_MS ||
    (previous !== null && upload.at <= previous.at)
  ) {
    return unauthorized();
  }

  await kv.set(
    buddyKeys.macSnapshot(machine),
    JSON.stringify(nextSnapshot(previous, upload, receivedAt)),
  );
  return Response.json({ ok: true, visitors: countersOf([fed, patted]) });
}
