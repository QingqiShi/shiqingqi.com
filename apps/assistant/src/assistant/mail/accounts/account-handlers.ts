import "server-only";
import { mailRouteDeps } from "../mail-route-deps.ts";
import { makeAccountHandlers } from "./make-account-handlers.ts";

export const accountHandlers = makeAccountHandlers(mailRouteDeps);
