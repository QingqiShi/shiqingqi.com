import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ComponentProps<"button"> {
  bright?: boolean;
  hideLabelOnMobile?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  labelId?: string;
}

export function Button({
  bright,
  children,
  className,
  hideLabelOnMobile,
  icon,
  isActive,
  labelId,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        // Base styles
        "inline-flex items-center justify-center",
        "border-0 appearance-none",
        "font-medium rounded-full shadow-md",
        "transition-all duration-200",
        "min-h-[40px] md:min-h-[32px]",
        "px-3 md:px-[12px] py-1 md:py-[4px]",
        "gap-2 md:gap-[8px]",

        // Default variant (secondary)
        !isActive &&
          !bright && [
            "surface-raised",
            "text-gray-12 dark:text-grayDark-12",
            "hover:bg-gray-3 dark:hover:bg-grayDark-3",
          ],

        // Active variant (primary)
        isActive && [
          "bg-purple-9 text-white",
          "hover:bg-purple-10",
          "dark:bg-purpleDark-9 dark:hover:bg-purpleDark-10",
        ],

        // Bright variant
        bright && [
          "bg-white dark:bg-gray-11",
          "text-gray-12 dark:text-grayDark-12",
          "hover:brightness-110",
        ],

        // Icon padding adjustments
        icon && children && !hideLabelOnMobile && "pl-2 md:pl-[8px]",
        icon && children && hideLabelOnMobile && "pl-3 md:pl-[8px]",

        // Disabled state
        "disabled:opacity-70 disabled:cursor-not-allowed",
        "disabled:hover:bg-gray-2 dark:disabled:hover:bg-grayDark-2",

        className,
      )}
    >
      {icon && <span className="inline-flex">{icon}</span>}
      {children && (
        <span
          id={labelId}
          className={cn(
            "inline-flex items-center gap-2 md:gap-[8px]",
            hideLabelOnMobile && "hidden md:inline-flex",
          )}
        >
          {children}
        </span>
      )}
    </button>
  );
}
