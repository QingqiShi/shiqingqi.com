"use client";

import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
      "transition-colors duration-200",
      "focus-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "bg-gray-6 dark:bg-grayDark-6",
      "data-[state=checked]:bg-purple-9 dark:data-[state=checked]:bg-purpleDark-9",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full",
        "bg-white dark:bg-gray-1",
        "shadow-lg ring-0",
        "transition-transform duration-200",
        "data-[state=checked]:translate-x-5",
        "data-[state=unchecked]:translate-x-0.5",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
