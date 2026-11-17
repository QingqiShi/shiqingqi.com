import { generateToken } from "@tuja/server-auth/generate-token";
import { hashToken } from "@tuja/server-auth/hash-token";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** The secret part of an invite link: 256 random bits. */
export const inviteToken = {
  create: generateToken,
  isValid: (value: string): boolean => TOKEN_PATTERN.test(value),
  /** What the database holds of a token, so that a copy of the table lets nobody join. */
  hash: (token: string): string =>
    Buffer.from(hashToken(token)).toString("hex"),
};
