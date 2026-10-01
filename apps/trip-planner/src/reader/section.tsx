import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A labelled block within a day: muted icon + heading, then content. */
export function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t pt-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4" />
        {title}
      </h3>
      {children}
    </section>
  );
}
