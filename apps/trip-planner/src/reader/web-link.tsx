import { ExternalLink } from "lucide-react";

/** An "官网" external link. */
export function WebLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      <ExternalLink className="size-3" />
      官网
    </a>
  );
}
