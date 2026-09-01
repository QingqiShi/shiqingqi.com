import { ExternalLink } from "lucide-react";

/** A "菜单" external link. */
export function MenuLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      <ExternalLink className="size-3" />
      菜单
    </a>
  );
}
