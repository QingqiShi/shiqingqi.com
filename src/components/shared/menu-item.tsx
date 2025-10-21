import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface ItemProps {
  ariaLabel?: string;
  autoFocus?: boolean;
  href: string;
  isActive?: boolean;
  onBeforeNavigation?: () => void;
  onAfterNavigation?: () => void;
}

export function MenuItem({
  children,
  ariaLabel,
  href,
  isActive,
  autoFocus,
  onBeforeNavigation,
  onAfterNavigation,
}: PropsWithChildren<ItemProps>) {
  const router = useRouter();

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      role="menuItem"
      className={cn(
        "flex items-center justify-between gap-5 md:gap-[20px]",
        "h-[40px] md:h-[32px] p-3 md:p-[12px]",
        "font-semibold text-base md:text-[16px]",
        "rounded-sm no-underline",
        "transition-colors duration-200",
        isActive
          ? "text-white bg-purple-9 pointer-events-none"
          : "text-gray-12 dark:text-grayDark-12 hover:text-gray-11 dark:hover:text-grayDark-11 hover:bg-gray-3 dark:hover:bg-grayDark-3",
      )}
      ref={(el) => {
        if (autoFocus) el?.focus();
      }}
      tabIndex={isActive ? -1 : 0}
      onClick={(e) => {
        e.preventDefault();

        onBeforeNavigation?.();
        router.push(href);
        onAfterNavigation?.();
      }}
    >
      {children}
    </a>
  );
}
