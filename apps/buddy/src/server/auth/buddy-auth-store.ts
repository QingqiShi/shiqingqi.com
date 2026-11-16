import { makeAuthStore } from "@tuja/server-auth/make-auth-store";
import { emailCodes, passkeys, sessions, signUps } from "../db/schema.ts";

export const buddyAuthStore = makeAuthStore({
  emailCodes,
  signUps,
  passkeys,
  sessions,
});
