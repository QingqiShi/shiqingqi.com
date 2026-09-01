import type { ReactNode } from "react";
import { googleMapsUrl } from "@/lib/maps/google-maps-url";
import { cn } from "@/lib/utils";

/** A text link that opens the query in Google Maps. */
export function MapsLink({
  query,
  children,
  className,
}: {
  query: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={googleMapsUrl(query)}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "inline-flex items-center gap-1 underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
    </a>
  );
}
