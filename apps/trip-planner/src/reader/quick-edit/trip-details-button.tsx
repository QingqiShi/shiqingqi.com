"use client";

import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import type { ComponentProps } from "react";
import { useQuickEdit } from "./quick-edit-context.ts";

/** Opens the details of the trip, for a person who can change the trip. Without `children` it is only an icon. */
export function TripDetailsButton({
  look = "outline",
  size = "sm",
  children,
}: Pick<ComponentProps<typeof Button>, "look" | "size" | "children">) {
  const quickEdit = useQuickEdit();
  const label = t({ en: "Trip details", zh: "行程信息" });
  if (!quickEdit) return null;
  return (
    <Button
      look={look}
      size={size}
      icon={<SlidersHorizontalIcon weight="bold" />}
      aria-label={children ? undefined : label}
      onClick={() => {
        quickEdit.open({ kind: "trip" });
      }}
    >
      {children}
    </Button>
  );
}
