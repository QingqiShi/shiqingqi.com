"use client";

import { SettingsColumns } from "./settings-frame.tsx";
import { SettingsSectionSkeleton } from "./settings-section-skeleton.tsx";

/** A screen of Settings before it can show: the section as blocks. */
export function SettingsSkeleton() {
  return (
    <SettingsColumns>
      <SettingsSectionSkeleton />
    </SettingsColumns>
  );
}
