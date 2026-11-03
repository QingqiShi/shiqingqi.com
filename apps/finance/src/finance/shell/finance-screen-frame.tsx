"use client";

import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
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
    <NavigationSplitView
      content={{
        label,
        accessory: <FinanceAddButton />,
        node: children,
      }}
    />
  );
}
