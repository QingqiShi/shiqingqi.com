"use client";

import { SettingsFrame } from "./settings-frame.tsx";
import { SettingsSectionSkeleton } from "./settings-section-skeleton.tsx";

/** A screen of Settings before it can show: the section as blocks. */
export function SettingsSkeleton() {
  return (
    <SettingsFrame>
      <SettingsSectionSkeleton />
    </SettingsFrame>
  );
}
