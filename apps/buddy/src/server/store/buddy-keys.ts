/**
 * Every Redis key of Buddy's pet data. Each key has one writer: the machine
 * registry, after a change in Postgres (a Mac's connect and removal, the
 * owner's visibility toggle, and the daily cron), writes `macKey`,
 * `accountMacs` and `publicAccount`; only the Mac's own signed uploads write
 * `macSnapshot`. A read merges the snapshots.
 */
export const buddyKeys = {
  /** The sealed `MacKey` of a connected Mac. */
  macKey: (machineId: string) => `buddy:mac:${machineId}:key`,
  /** The Mac's newest upload, its days merged with every upload before. */
  macSnapshot: (machineId: string) => `buddy:mac:${machineId}:snapshot`,
  /** The account id, only while the account's page is public. */
  publicAccount: (name: string) => `buddy:user:${name}:public`,
  /** Every Mac of the account that was not removed, also one that stopped uploading. */
  accountMacs: (name: string) => `buddy:user:${name}:macs`,
};
