/**
 * Calculates a person's age from their birthday and an optional death date.
 *
 * Uses UTC methods to avoid timezone-related off-by-one errors.
 * TMDB date strings like "1990-01-15" are parsed as UTC midnight by the
 * Date constructor. Using local-time getters (getFullYear, getMonth,
 * getDate) would shift the date backward in negative-UTC-offset timezones,
 * potentially returning the wrong age on boundary dates.
 *
 * @param birthday - ISO date string (YYYY-MM-DD)
 * @param deathday - ISO date string or null (uses current UTC date)
 * @returns Age in whole years
 */
export function calculateAge(
  birthday: string,
  deathday: string | null,
): number {
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = end.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && end.getUTCDate() < birth.getUTCDate())
  ) {
    age--;
  }
  return age;
}
