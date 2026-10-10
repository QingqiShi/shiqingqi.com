"use client";

import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useReplica } from "../replica/use-replica.ts";
import { CategoriesSettings } from "./categories-settings.tsx";
import { ConnectionsSettings } from "./connections-settings.tsx";
import { DataSettings } from "./data-settings.tsx";
import { ExchangeRatesSettings } from "./exchange-rates-settings.tsx";
import { GroupsSettings } from "./groups-settings.tsx";
import { HouseholdSettings } from "./household-settings.tsx";
import { MembersSettings } from "./members-settings.tsx";
import { PayeesSettings } from "./payees-settings.tsx";
import { RulesSettings } from "./rules-settings.tsx";
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
  connections: ConnectionsSettings,
  data: DataSettings,
};

/** One Settings section, once the Replica has loaded. */
export function SettingsSectionView({ section }: { section: SettingsSection }) {
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  if (!bootstrapped) {
    return (
      <div css={stack.item} aria-busy>
        <Skeleton width="10rem" height="1.5rem" />
        <Skeleton width="100%" height="10rem" />
      </div>
    );
  }
  const View = VIEWS[section];
  return <View />;
}
