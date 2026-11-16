import type { ListRowLinkProps } from "@tuja/ui/components/list-row";

/** A `ListRow` link to another site, such as Google Maps, in a new tab. */
export function ExternalRowLink(props: ListRowLinkProps) {
  return <a {...props} target="_blank" rel="noreferrer noopener" />;
}
