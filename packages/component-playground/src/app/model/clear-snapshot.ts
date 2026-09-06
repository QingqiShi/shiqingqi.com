export function clearSnapshot(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Nothing to do. */
  }
}
