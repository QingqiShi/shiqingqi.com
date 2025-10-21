import type { ReactNode } from "react";
import { Card } from "@/components/shared/card";
import { cn } from "@/lib/utils";

interface ProjectCardProps extends React.ComponentProps<typeof Card> {
  icon: ReactNode;
  name: string;
  description: string;
}

export function ProjectCard({
  icon,
  name,
  description,
  className,
  style,
  ...rest
}: ProjectCardProps) {
  return (
    <Card
      {...rest}
      className={cn(
        "relative text-gray-11 dark:text-grayDark-11",
        "[--svg-fill:theme(colors.gray.11)] dark:[--svg-fill:theme(colors.grayDark.11)]",
        "hover:[--svg-fill:theme(colors.gray.12)] dark:hover:[--svg-fill:theme(colors.grayDark.12)]",
        className,
      )}
      style={style}
    >
      <div className="grid grid-cols-[64px_1fr] items-center gap-0 mb-1">
        <div className="flex items-center justify-start min-h-0 [color:var(--svg-fill)]">
          {icon}
        </div>
        <div className="text-base font-bold text-gray-11 dark:text-grayDark-11">
          {name}
        </div>
      </div>
      <div className="text-sm font-normal text-gray-11 dark:text-grayDark-11">
        {description}
      </div>
    </Card>
  );
}
