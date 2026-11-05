import { sql } from "drizzle-orm";
import { bigint, char, customType } from "drizzle-orm/pg-core";

export const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

export const NIL_UUID = sql`'00000000-0000-0000-0000-000000000000'::uuid`;

export function minor(name: string) {
  return bigint(name, { mode: "number" });
}

export function currency(name: string) {
  return char(name, { length: 3 });
}
