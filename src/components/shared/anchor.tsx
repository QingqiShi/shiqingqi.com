import Link from "next/link";
import { cn } from "@/lib/utils";

export function Anchor({
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        "font-semibold",
        "text-gray-12 dark:text-grayDark-12",
        "hover:text-gray-11 dark:hover:text-grayDark-11",
        "hover:underline hover:decoration-2",
        "transition-colors duration-200",
        className,
      )}
    />
  );
}
