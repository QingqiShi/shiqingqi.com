import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface AnchorButtonGroupProps {
  bright?: boolean;
}

export function AnchorButtonGroup({
  bright,
  children,
}: PropsWithChildren<AnchorButtonGroupProps>) {
  return (
    <div
      className={cn(
        "inline-flex gap-1 p-1 rounded-2xl shadow-md justify-center relative",
        "[--button-border-radius:theme(borderRadius.lg)] [--button-box-shadow:none] [--button-height:32px]",
        bright ? "bg-white dark:bg-gray-11" : "surface-raised",
      )}
    >
      {children}
    </div>
  );
}
