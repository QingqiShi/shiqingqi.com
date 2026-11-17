import { randomBytes } from "node:crypto";
import { HttpError } from "@tuja/server-auth/http-error";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";

const NAME_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const NAME_LENGTH = 8;
const NAME_ATTEMPTS = 5;

function generateAccountName() {
  // 256 is not a multiple of 36, so a plain modulo would favor some characters.
  const unbiasedLimit = 256 - (256 % NAME_ALPHABET.length);
  let name = "";
  while (name.length < NAME_LENGTH) {
    for (const byte of randomBytes(NAME_LENGTH)) {
      if (byte < unbiasedLimit && name.length < NAME_LENGTH) {
        name += NAME_ALPHABET[byte % NAME_ALPHABET.length];
      }
    }
  }
  return name;
}

/** Makes the account of a sign-up under a new random name. */
export async function createAccount(
  tx: BuddyDb,
  { userId, email, now }: { userId: string; email: string; now: Date },
) {
  for (let attempt = 0; attempt < NAME_ATTEMPTS; attempt++) {
    const name = generateAccountName();
    const created = await tx
      .insert(accounts)
      .values({ id: userId, name, email, createdAt: now })
      .onConflictDoNothing()
      .returning({ id: accounts.id });
    if (created.length > 0) return {};
  }
  throw new HttpError(409, "email_registered");
}
