import { cn } from "@/lib/utils";
import { Anchor } from "./anchor";

interface AnchorButtonProps extends React.ComponentProps<typeof Anchor> {
  bright?: boolean;
  hideLabelOnMobile?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export function AnchorButton({
  bright,
  children,
  className,
  hideLabelOnMobile,
  icon,
  isActive,
  style,
  ...props
}: AnchorButtonProps) {
  return (
    <Anchor
      {...props}
      className={cn(
        // Base styles
        "inline-flex items-center gap-2",
        "min-h-[40px] md:min-h-[32px]",
        "py-1 px-3 rounded-full",
        "text-base no-underline cursor-pointer",
        "transition-all duration-200",

        // Icon padding adjustment
        icon && children && (hideLabelOnMobile ? "pl-3 md:pl-2" : "pl-2"),

        // Variant styles
        !isActive &&
          !bright && [
            "surface-raised surface-hover",
            "text-gray-12 dark:text-grayDark-12",
          ],
        isActive && ["bg-purple-9 text-white", "hover:bg-purple-10"],
        bright && [
          "bg-white dark:bg-gray-11",
          "text-gray-12 dark:text-grayDark-1",
          "hover:brightness-110",
        ],

        className,
      )}
      style={style}
    >
      {icon && <span className="inline-flex">{icon}</span>}
      {children && (
        <span
          className={cn(
            "inline-flex items-center gap-2",
            hideLabelOnMobile && "hidden md:inline-flex",
          )}
        >
          {children}
        </span>
      )}
    </Anchor>
  );
}
