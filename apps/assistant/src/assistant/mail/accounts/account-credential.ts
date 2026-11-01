import { z } from "zod";
import { credentialCipher } from "./credential-cipher.ts";

const accountCredentialSchema = z.discriminatedUnion("type", [
  /** iCloud: the app-specific password. */
  z.object({ type: z.literal("password"), password: z.string().min(1) }),
  /** Gmail and Outlook. The access token is kept until it expires. */
  z.object({
    type: z.literal("oauth"),
    refreshToken: z.string().min(1),
    accessToken: z.string().min(1),
    /** Epoch milliseconds. */
    accessTokenExpiresAt: z.number(),
  }),
]);

export type AccountCredential = z.infer<typeof accountCredentialSchema>;

export interface CredentialOwner {
  userId: string;
  accountId: string;
}

function associatedDataOf({ userId, accountId }: CredentialOwner) {
  return `mail-account:${userId}:${accountId}`;
}

/** A mail account's login, sealed so that it opens only for that account of that user. */
export const accountCredential = {
  seal(
    credential: AccountCredential,
    key: Uint8Array,
    owner: CredentialOwner,
  ): Uint8Array {
    return credentialCipher.seal(
      JSON.stringify(credential),
      key,
      associatedDataOf(owner),
    );
  },

  /** Null when the bytes do not open with this key for this account. */
  open(
    sealed: Uint8Array,
    key: Uint8Array,
    owner: CredentialOwner,
  ): AccountCredential | null {
    const opened = credentialCipher.open(sealed, key, associatedDataOf(owner));
    if (opened === null) return null;
    try {
      const parsed = accountCredentialSchema.safeParse(JSON.parse(opened));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
};
