"use client";

import { SettingsFrame } from "./settings-frame.tsx";
import { SettingsSectionSkeleton } from "./settings-section-skeleton.tsx";

/** Settings before its first section can show: the menu is real, as nothing in it waits. */
export function SettingsSkeleton() {
  return (
    <SettingsFrame>
      <SettingsSectionSkeleton />
    </SettingsFrame>
  );
}
