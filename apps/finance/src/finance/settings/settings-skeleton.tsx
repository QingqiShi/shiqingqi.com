"use client";

import { SettingsColumns } from "./settings-frame.tsx";
import { SettingsSectionSkeleton } from "./settings-section-skeleton.tsx";

/** `/settings` before it can show: the menu is real, as nothing in it waits, beside the open section as blocks. */
export function SettingsSkeleton() {
  return (
    <SettingsColumns>
      <SettingsSectionSkeleton />
    </SettingsColumns>
  );
}
