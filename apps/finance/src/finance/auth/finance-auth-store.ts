import { makeAuthStore } from "@tuja/server-auth/make-auth-store";
import {
  emailCodes,
  passkeys,
  recoveries,
  sessions,
  signUps,
} from "#src/finance/db/schema.ts";

export const financeAuthStore = makeAuthStore({
  emailCodes,
  signUps,
  recoveries,
  passkeys,
  sessions,
});
