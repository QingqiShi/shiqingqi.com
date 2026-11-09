import {
  authenticateSignedRead,
  type SignedReadDeps,
} from "../upload/authenticate-signed-read.ts";
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
  deps: SignedReadDeps,
): Promise<Response> {
  const read = await authenticateSignedRead(request, user, deps);
  if (!read) return unauthorized();
  const state = await readPetState(deps.kv, user, {
    includePrivate: true,
    excludeMachine: read.machine,
  });
  if (!state) return unauthorized();
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
