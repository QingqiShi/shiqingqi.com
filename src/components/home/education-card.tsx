import type { StaticImageData } from "next/image";
import Image from "next/image";
import { Suspense } from "react";
import { Card } from "@/components/shared/card";
import { Skeleton } from "@/components/shared/skeleton";
import { cn } from "@/lib/utils";

interface EducationCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode | { src: StaticImageData; alt: string };
  name: string;
  dates: string;
}

export function EducationCard({
  logo,
  name,
  dates,
  className,
  style,
  ...rest
}: EducationCardProps) {
  return (
    <Card
      {...rest}
      className={cn(
        "aspect-video items-center grid gap-1 grid-rows-[1fr_auto] justify-start",
        "[--svg-fill:theme(colors.gray.11)] dark:[--svg-fill:theme(colors.grayDark.11)]",
        "hover:[--svg-fill:theme(colors.gray.12)] dark:hover:[--svg-fill:theme(colors.grayDark.12)]",
        className,
      )}
      style={style}
    >
      <div className="flex items-center gap-1">
        <div className="flex items-center aspect-square justify-start min-h-0 w-2/5">
          {typeof logo === "object" && logo && "src" in logo ? (
            <Image
              src={logo.src}
              alt={logo.alt}
              title={logo.alt}
              className="h-full max-w-full object-contain [filter:var(--card-image-filter)] transition-[filter] duration-200"
            />
          ) : (
            <Suspense fallback={<Skeleton fill />}>{logo}</Suspense>
          )}
        </div>
        <span className="text-base font-bold w-3/5 text-gray-11 dark:text-grayDark-11">
          {name}
        </span>
      </div>
      <time className="text-sm font-semibold text-gray-11 dark:text-grayDark-11">
        {dates}
      </time>
    </Card>
  );
}
