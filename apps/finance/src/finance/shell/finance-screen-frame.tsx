"use client";

import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import type { ReactNode } from "react";
import { FinanceAddButton } from "./finance-add-button.tsx";

interface FinanceScreenFrameProps {
  label: string;
  children: ReactNode;
}

/** A Finance screen of one pane with the Add action, the same for the screen and its skeleton. */
export function FinanceScreenFrame({
  label,
  children,
}: FinanceScreenFrameProps) {
  return (
    <NavigationStack label={label} accessory={<FinanceAddButton />}>
      {children}
    </NavigationStack>
  );
}
