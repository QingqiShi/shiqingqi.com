import { Suspense } from "react";
import { Card } from "@/components/shared/card";
import { Skeleton } from "@/components/shared/skeleton";
import { cn } from "@/lib/utils";

interface ExperienceCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode;
  dates: string;
}

export function ExperienceCard({
  logo,
  dates,
  className,
  style,
  ...rest
}: ExperienceCardProps) {
  return (
    <Card
      {...rest}
      className={cn(
        "items-center grid gap-1 grid-rows-[1fr_auto] justify-start",
        "[--svg-fill:theme(colors.gray.11)] dark:[--svg-fill:theme(colors.grayDark.11)]",
        "hover:[--svg-fill:theme(colors.gray.12)] dark:hover:[--svg-fill:theme(colors.grayDark.12)]",
        className,
      )}
      style={style}
    >
      <Suspense fallback={<Skeleton />}>
        <div className="flex items-center aspect-[2/1] h-full justify-start min-h-0">
          {logo}
        </div>
      </Suspense>
      <time className="text-sm font-semibold text-gray-11 dark:text-grayDark-11">
        {dates}
      </time>
    </Card>
  );
}
