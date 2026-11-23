import { makeAuthStore } from "@tuja/server-auth/make-auth-store";
import {
  emailCodes,
  passkeys,
  recoveries,
  sessions,
  signUps,
} from "#src/db/auth-schema.ts";

export const fundAuthStore = makeAuthStore({
  emailCodes,
  signUps,
  recoveries,
  passkeys,
  sessions,
});
