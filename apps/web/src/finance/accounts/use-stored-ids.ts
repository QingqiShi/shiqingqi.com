import { useState } from "react";
import { storedIds } from "./stored-ids.ts";

/** A list of ids this device remembers, such as the extra rows of "Update balances". */
export function useStoredIds(key: string) {
  const [ids, setIds] = useState<readonly string[]>(() =>
    typeof window === "undefined" ? [] : storedIds.read(key),
  );
  const change = (next: readonly string[]) => {
    setIds(next);
    storedIds.write(key, next);
  };
  return [ids, change] as const;
}
