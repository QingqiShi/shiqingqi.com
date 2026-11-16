import { z } from "zod";

const locale = z.enum(["en", "zh"]).default("en");

/** The request bodies that the auth routes of every app read. */
export const authBodies = {
  locale,
  /** The token of an emailed link. */
  token: z.object({ token: z.string().min(1).max(200) }),
  /** A typed code from an email. */
  code: z.object({ code: z.string().max(20) }),
  email: z.object({ email: z.string().max(320), locale }),
};

export type AuthLocale = z.infer<typeof locale>;
