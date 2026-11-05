"use client";

import {
  createContext,
  use,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";

/**
 * The contract of a link Slot. Everything a component hands the Slot has to
 * reach the rendered anchor: `href` and `children`, `className` and `style`
 * (which carry the whole look), `ref` (the press animation measures the
 * element), and the anchor attributes and event handlers that arrive in the
 * rest, the press handlers among them.
 */
export interface LinkSlotProps extends ComponentProps<"a"> {
  href: string;
}

export type LinkSlot = ComponentType<LinkSlotProps>;

export function PlainAnchor(props: LinkSlotProps) {
  return <a {...props} />;
}

const LinkSlotContext = createContext<LinkSlot>(PlainAnchor);

interface LinkProviderProps {
  /**
   * The link every `Button` with an `href` below it renders, usually a
   * framework link such as `next/link`. A `Button` can still pass its own
   * `linkComponent`. Without a provider a link is a plain `<a>`.
   *
   * Forward every prop it is handed onto the rendered anchor, or the link
   * loses its look, its press animation, or both.
   *
   * @zh 其下每个带 `href` 的 `Button` 所渲染的链接组件，通常是框架自带的链接（例如 `next/link`）。单个 `Button` 仍可传入自己的 `linkComponent`。没有 provider 时，链接是原生 `<a>`。
   *
   * 请把收到的每一个 prop 都转发到渲染出的锚点上，否则链接会失去外观、按压动画，或两者皆失。
   */
  linkComponent: LinkSlot;
  /**
   * The part of the app that uses this link, usually the whole app.
   *
   * @zh 使用此链接组件的那部分应用，通常是整个应用。
   */
  children: ReactNode;
}

/**
 * Sets the link once for an app, at its root, so that a `Button` needs only an
 * `href` to navigate with the app's router.
 */
export function LinkProvider({ linkComponent, children }: LinkProviderProps) {
  return <LinkSlotContext value={linkComponent}>{children}</LinkSlotContext>;
}

/** The link to render: the given one, else the nearest provider's, else `<a>`. */
export function useLinkSlot(linkComponent?: LinkSlot): LinkSlot {
  const provided = use(LinkSlotContext);
  return linkComponent ?? provided;
}
