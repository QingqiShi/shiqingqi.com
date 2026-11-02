"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { NewTransactionSheet } from "../shell/new-transaction-sheet.tsx";
import { SettingsIslands } from "./settings-islands.tsx";
import { isSettingsSection } from "./settings-sections.ts";

/**
 * Settings: the section menu beside the open section at `lg` and wider,
 * each in its own island. Below `lg` the menu is its own page and each
 * section opens on its own with a way back. Below `md` the menu page also
 * shows the signed-in Member and the Finance mark. A new Transaction opens
 * in a sheet over Settings.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  return (
    <>
      <SettingsIslands current={isSettingsSection(segment) ? segment : null}>
        {children}
      </SettingsIslands>
      <NewTransactionSheet />
    </>
  );
}
