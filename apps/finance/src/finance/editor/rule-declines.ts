import { storedIds } from "../accounts/stored-ids.ts";

const STORAGE_KEY = "finance:rule-declines";

/**
 * The Payees whose "Make it a rule?" offer was declined on this device. It
 * is a convenience: when storage is blocked, the offer shows again.
 */
export const ruleDeclines = {
  has(payeeId: string) {
    return storedIds.read(STORAGE_KEY).includes(payeeId);
  },
  add(payeeId: string) {
    const declined = new Set(storedIds.read(STORAGE_KEY));
    declined.add(payeeId);
    storedIds.write(STORAGE_KEY, declined);
  },
};
