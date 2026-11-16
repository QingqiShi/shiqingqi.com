import { makeAuthStore } from "@tuja/server-auth/make-auth-store";
import {
  emailCodes,
  passkeys,
  sessions,
  signUps,
} from "#src/finance/db/schema.ts";

export const financeAuthStore = makeAuthStore({
  emailCodes,
  signUps,
  passkeys,
  sessions,
});
