/** A list of ids this device keeps in `localStorage` under one key. */
export const storedIds = {
  read(key: string): string[] {
    try {
      const parsed: unknown = JSON.parse(
        window.localStorage.getItem(key) ?? "[]",
      );
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  },
  write(key: string, ids: Iterable<string>) {
    try {
      window.localStorage.setItem(key, JSON.stringify([...ids]));
    } catch {
      // Storage is blocked or full. The list stays only for this visit.
    }
  },
};
