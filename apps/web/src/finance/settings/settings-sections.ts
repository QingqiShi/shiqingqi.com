/** The Settings sections in their groups, in the order the menu lists them. */
export const SETTINGS_GROUPS = [
  { id: "general", sections: ["household", "members", "exchange-rates"] },
  { id: "organising", sections: ["groups", "categories", "payees", "tags"] },
  { id: "automation", sections: ["rules", "ai", "connections"] },
  { id: "device", sections: ["preferences", "data"] },
] as const;

export type SettingsGroup = (typeof SETTINGS_GROUPS)[number]["id"];

export type SettingsSection =
  (typeof SETTINGS_GROUPS)[number]["sections"][number];

/** The Settings sections, in the order the menu lists them. */
export const SETTINGS_SECTIONS: readonly SettingsSection[] =
  SETTINGS_GROUPS.flatMap((group) => group.sections);

export function isSettingsSection(
  value: string | null,
): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section === value);
}
