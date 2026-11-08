import "server-only";
import { requireAuthSecret } from "../auth/get-auth-secret.ts";
import { getBuddyBackend } from "../store/get-buddy-backend.ts";
import { makeMachineRegistry } from "./make-machine-registry.ts";

export function getMachineRegistry() {
  return makeMachineRegistry({
    kv: getBuddyBackend().kv,
    secret: requireAuthSecret(),
  });
}
