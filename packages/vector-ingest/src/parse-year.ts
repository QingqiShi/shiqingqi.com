export function parseYear(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const year = parseInt(dateStr.substring(0, 4), 10);
  return Number.isNaN(year) ? 0 : year;
}
