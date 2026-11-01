import "server-only";
import { mailRouteDeps } from "../mail-route-deps.ts";
import { makeConnectHandlers } from "./make-connect-handlers.ts";
import { readOAuthClient } from "./oauth-providers.ts";

export const connectHandlers = makeConnectHandlers({
  ...mailRouteDeps,
  authSecret: () => process.env.ASSISTANT_AUTH_SECRET,
  oauthClient: (provider) => readOAuthClient(provider),
  fetch: (input, init) => fetch(input, init),
});
