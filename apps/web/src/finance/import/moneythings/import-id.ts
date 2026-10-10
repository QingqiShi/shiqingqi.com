import { nameBasedUuid } from "../../ids/name-based-uuid.ts";

const FINANCE_IMPORT_NAMESPACE = "5f531b16-9a9e-4bd1-b5c7-8aa7e7657467";

/**
 * The id of an imported row: the same source key gives the same id on every
 * run, so a re-import updates rows in place.
 */
export function importId(entity: string, ...key: string[]): string {
  return nameBasedUuid(`${entity}:${key.join(":")}`, FINANCE_IMPORT_NAMESPACE);
}
