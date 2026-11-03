"use client";

import { useReplica } from "../replica/use-replica.ts";
import { AiSettings } from "./ai-settings.tsx";
import { CategoriesSettings } from "./categories-settings.tsx";
import { ConnectionsSettings } from "./connections-settings.tsx";
import { DataSettings } from "./data-settings.tsx";
import { ExchangeRatesSettings } from "./exchange-rates-settings.tsx";
import { GroupsSettings } from "./groups-settings.tsx";
import { HouseholdSettings } from "./household-settings.tsx";
import { MembersSettings } from "./members-settings.tsx";
import { PayeesSettings } from "./payees-settings.tsx";
import { PreferencesSettings } from "./preferences-settings.tsx";
import { RulesSettings } from "./rules-settings.tsx";
import { SettingsSectionSkeleton } from "./settings-section-skeleton.tsx";
import type { SettingsSection } from "./settings-sections.ts";
import { TagsSettings } from "./tags-settings.tsx";

const VIEWS: Record<SettingsSection, () => React.ReactNode> = {
  household: HouseholdSettings,
  "exchange-rates": ExchangeRatesSettings,
  members: MembersSettings,
  groups: GroupsSettings,
  categories: CategoriesSettings,
  payees: PayeesSettings,
  tags: TagsSettings,
  rules: RulesSettings,
  ai: AiSettings,
  connections: ConnectionsSettings,
  data: DataSettings,
  preferences: PreferencesSettings,
};

/** One Settings section, once the Replica has loaded. */
export function SettingsSectionView({ section }: { section: SettingsSection }) {
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  if (!bootstrapped) return <SettingsSectionSkeleton />;
  const View = VIEWS[section];
  return <View />;
}
