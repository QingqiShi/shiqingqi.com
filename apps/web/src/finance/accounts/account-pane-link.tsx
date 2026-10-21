"use client";

import type { ListRowLinkProps } from "@tuja/ui/components/list-row";
import { Link } from "#src/links/link.tsx";
import { useUrlSelection } from "../shell/use-url-selection.ts";

/**
 * The link of an account row that opens the account in the pane beside the
 * Net worth list. It keeps the list where it is, and the trend moves to the
 * list when the pane opens.
 */
export function AccountPaneLink(props: ListRowLinkProps) {
  const selection = useUrlSelection("account");
  return <Link {...props} {...selection.linkProps} />;
}
