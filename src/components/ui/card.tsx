import { type VariantProps, tv } from "tailwind-variants";
import { cn } from "@/lib/utils";

const card = tv({
  base: ["rounded-lg", "surface-raised", "transition-all duration-300"],
  variants: {
    hover: {
      true: [
        "cursor-pointer",
        "hover:scale-[1.02]",
        "hover:-translate-y-1",
        "hover:shadow-lg",
        "hover:bg-gray-3 dark:hover:bg-grayDark-3",
      ],
      false: "",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    hover: false,
    padding: "md",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof card> {}

export function Card({ className, hover, padding, ...props }: CardProps) {
  return <div className={cn(card({ hover, padding }), className)} {...props} />;
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5", className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-2xl font-bold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-secondary text-sm", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center pt-0", className)} {...props} />;
}
