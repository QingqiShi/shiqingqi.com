import { isValidElement, type ReactNode } from "react";

/** Every string and number in an element tree, joined, for picking a font subset. */
export function collectElementText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectElementText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return collectElementText(node.props.children);
  }
  return "";
}
