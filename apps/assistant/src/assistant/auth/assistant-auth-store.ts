import { makeAuthStore } from "@tuja/server-auth/make-auth-store";
import {
  emailCodes,
  passkeys,
  recoveries,
  sessions,
  signUps,
} from "#src/assistant/db/schema.ts";

export const assistantAuthStore = makeAuthStore({
  emailCodes,
  signUps,
  recoveries,
  passkeys,
  sessions,
});
