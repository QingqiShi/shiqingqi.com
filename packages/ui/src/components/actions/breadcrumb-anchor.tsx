import type { BreadcrumbLinkProps } from "./breadcrumb.tsx";

/** @internal */
export function BreadcrumbAnchor({
  href,
  children,
  className,
  style,
}: BreadcrumbLinkProps) {
  return (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  );
}
