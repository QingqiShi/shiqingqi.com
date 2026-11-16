import { HttpError } from "./http-error.ts";
import type { AuthStore, AuthTx } from "./make-auth-store.ts";

/** The parts of an app's `AuthConfig` that say whose a recovery link is. */
export interface RecoveryLookupConfig<Db, Tx extends AuthTx> {
  store: AuthStore;
  transaction: <T>(db: Db, run: (tx: Tx) => Promise<T>) => Promise<T>;
  signIn: (tx: Tx, userId: string) => Promise<unknown>;
  passkeyName: (tx: Tx, userId: string) => Promise<string>;
}

/**
 * The open recovery link of a token at `now`, with the name of its user.
 * Null when the link is unknown, used or expired, or when its user may not
 * sign in.
 */
export async function lookupRecovery<Db, Tx extends AuthTx>(
  config: RecoveryLookupConfig<Db, Tx>,
  db: Db,
  token: string,
  now: Date,
): Promise<{ recoveryId: string; userId: string; userName: string } | null> {
  try {
    return await config.transaction(db, async (tx) => {
      const recovery = await config.store.lookupRecovery(tx, token, now);
      if (!recovery) return null;
      await config.signIn(tx, recovery.userId);
      return {
        ...recovery,
        userName: await config.passkeyName(tx, recovery.userId),
      };
    });
  } catch (error) {
    if (error instanceof HttpError) return null;
    throw error;
  }
}
