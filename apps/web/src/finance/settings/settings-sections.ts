/** The Settings sections, in the order the menu lists them. */
export const SETTINGS_SECTIONS = [
  "household",
  "exchange-rates",
  "members",
  "groups",
  "categories",
  "payees",
  "tags",
  "rules",
  "connections",
  "data",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function isSettingsSection(
  value: string | null,
): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section === value);
}
