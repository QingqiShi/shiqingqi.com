import type { CSSProperties, Ref } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  fill?: boolean;
  width?: number;
  height?: number;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

export function Skeleton({
  fill,
  width,
  height,
  delay,
  className,
  style,
  ref,
}: SkeletonProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "animate-pulse rounded-md bg-gray-10 dark:bg-grayDark-10 opacity-30 overflow-hidden",
        fill && "w-full h-full",
        className,
      )}
      style={{
        ...style,
        width: fill ? "100%" : width ? `${width}px` : undefined,
        height: fill ? "100%" : height ? `${height}px` : undefined,
        animationDelay: delay ? `${delay}ms` : undefined,
        animationDuration: "2s",
        animationTimingFunction: "cubic-bezier(.4,0,.6,1)",
        animationFillMode: "both",
        animationIterationCount: "infinite",
      }}
    />
  );
}
