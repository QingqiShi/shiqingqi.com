import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";

interface NavItemProps {
  href?: string;
  current?: boolean;
  children?: ReactNode;
}

function holds(node: ReactNode, href: string): boolean {
  return Children.toArray(node).some(
    (child) =>
      isValidElement<NavItemProps>(child) &&
      (child.props.href === href || holds(child.props.children, href)),
  );
}

/**
 * The content with `current` on the link the visitor followed, and on each
 * group that holds it, as a router would set it. Before the visitor follows a
 * link, `href` is `null` and the content keeps its own `current`. The content
 * goes through here both times, so React keeps the same rows and the marker
 * moves rather than remounts.
 */
export function markCurrent(node: ReactNode, href: string | null): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<NavItemProps>(child)) return child;
    if (child.type === NavLink) {
      return href === null
        ? child
        : cloneElement(child, { current: child.props.href === href });
    }
    const children = markCurrent(child.props.children, href);
    if (child.type === NavGroup && href !== null) {
      return cloneElement(
        child,
        { current: holds(child.props.children, href) },
        children,
      );
    }
    return cloneElement(child, undefined, children);
  });
}
