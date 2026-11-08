import "server-only";
import { getBuddyDb } from "../db/get-buddy-db.ts";
import { clientIp } from "../http/client-ip.ts";
import { getMachineRegistry } from "../machines/get-machine-registry.ts";
import { getBuddyBackend } from "../store/get-buddy-backend.ts";
import { makeConnectHandlers } from "./make-connect-handlers.ts";

export function getConnectHandlers() {
  return makeConnectHandlers({
    kv: getBuddyBackend().kv,
    getDb: getBuddyDb,
    registry: getMachineRegistry(),
    now: () => new Date(),
    clientIp,
  });
}
