import { type VariantProps, tv } from "tailwind-variants";
import { cn } from "@/lib/utils";

const button = tv({
  base: [
    "inline-flex items-center justify-center",
    "font-semibold rounded-lg",
    "transition-all duration-200",
    "focus-ring",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  variants: {
    variant: {
      primary: [
        "bg-purple-9 text-white",
        "hover:bg-purple-10",
        "active:bg-purple-11",
        "dark:bg-purpleDark-9 dark:hover:bg-purpleDark-10",
      ],
      secondary: [
        "surface-raised surface-hover",
        "text-gray-12 dark:text-grayDark-12",
      ],
      ghost: [
        "bg-transparent",
        "hover:bg-gray-3 dark:hover:bg-grayDark-3",
        "text-gray-12 dark:text-grayDark-12",
      ],
      link: [
        "bg-transparent",
        "underline-offset-4 hover:underline",
        "text-purple-11 hover:text-purple-12",
        "dark:text-purpleDark-11 dark:hover:text-purpleDark-12",
        "p-0 h-auto",
      ],
    },
    size: {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-4 py-2 text-base gap-2",
      lg: "px-6 py-3 text-lg gap-2.5",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(button({ variant, size }), className)} {...props} />
  );
}
