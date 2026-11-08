import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";
import { authenticateMachine } from "../upload/authenticate-machine.ts";
import { MAX_CLOCK_SKEW_MS } from "../upload/handle-upload.ts";
import {
  readReadHeaders,
  verifyReadSignature,
} from "../upload/verify-upload-signature.ts";
import { readPetState } from "./read-pet-state.ts";

const unauthorized = () =>
  Response.json({ error: "unauthorized" }, { status: 401 });

/**
 * `GET /api/v1/u/[user]/others`, signed by a connected Mac: the state of the
 * account's other Macs, also of a private page, so that the Mac can add its
 * own fresh count to what the others uploaded. Like the upload it reads
 * Redis alone, and every auth failure gets the same 401.
 */
export async function handleOthersRead(
  request: Request,
  user: string,
  { kv, secret, now }: { kv: BuddyKv; secret: string; now: () => number },
): Promise<Response> {
  const signed = readReadHeaders(request.headers);
  if (!signed) return unauthorized();
  const { machine, signature, at } = signed;
  const key = authenticateMachine({
    sealedKey: await kv.get(buddyKeys.macKey(machine)),
    secret,
    machine,
    user,
  });
  if (
    key === null ||
    Math.abs(now() - at) > MAX_CLOCK_SKEW_MS ||
    !verifyReadSignature({
      user,
      machine,
      at,
      signature,
      publicKey: key.publicKey,
    })
  ) {
    return unauthorized();
  }
  const state = await readPetState(kv, user, {
    includePrivate: true,
    excludeMachine: machine,
  });
  if (!state) return unauthorized();
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
