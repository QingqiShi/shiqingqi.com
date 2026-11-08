import "server-only";
import { getBuddyDb } from "../db/get-buddy-db.ts";
import { getMachineRegistry } from "./get-machine-registry.ts";
import { makeMachineHandlers } from "./make-machine-handlers.ts";

export function getMachineHandlers() {
  return makeMachineHandlers({
    getDb: getBuddyDb,
    registry: getMachineRegistry(),
    now: () => new Date(),
  });
}
