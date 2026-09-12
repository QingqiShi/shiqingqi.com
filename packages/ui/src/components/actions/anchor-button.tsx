"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useRef,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import { usePressHandlers } from "../../hooks/use-press-handlers.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { corner } from "../../primitives/corner.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { mergeRefs } from "../../utils/merge-refs.ts";
import {
  lookStyles,
  sharedStyles,
  sizeStyles,
} from "./button-shared.stylex.ts";

/**
 * The contract of the link Slot. Everything the component hands the Slot has to
 * reach the rendered anchor: `href` and `children`, `className` and `style`
 * (which carry the whole look), `ref` (the press animation measures the
 * element), and the anchor attributes and event handlers that arrive in the
 * rest — the press handlers among them.
 */
export interface AnchorButtonLinkProps extends ComponentProps<"a"> {
  href: string;
}

/** @internal */
function PlainAnchor(props: AnchorButtonLinkProps) {
  return <a {...props} />;
}

interface AnchorButtonBaseProps extends Omit<
  ComponentProps<"a">,
  "children" | "className" | "style"
> {
  /**
   * Destination. Required: a link styled as a button is still a link, and one
   * without a destination has no link role, no new tab and no context menu.
   *
   * @zh 目标地址。必填：外观像按钮的链接仍然是链接，没有目标地址就没有链接角色、新标签页与右键菜单。
   */
  href: string;
  /**
   * Lifts the link onto a bright surface, brightening further on hover.
   * Overrides `look`'s fill, so pairing it with `outline` or `ghost`
   * cancels their chrome.
   *
   * @zh 将链接置于明亮表面，悬停时进一步提亮。它会覆盖 `look` 的填充，因此与 `outline` 或 `ghost` 同用会抵消二者的外框处理。
   */
  bright?: boolean;
  /**
   * Below the `md` breakpoint, collapses to a square icon-only link and hides
   * the label. Pass `aria-label` too, so the collapsed form keeps its name.
   *
   * @zh 在 `md` 断点以下收起为纯图标的正方形链接，并隐藏标签。同时提供 `aria-label`，使收起后的链接仍保留名称。
   */
  hideLabelOnMobile?: boolean;
  /**
   * Decorative leading icon. Rendered `aria-hidden`; never the accessible
   * name. With no `children` the link is icon-only: a square of its own
   * height, named by `aria-label` or `aria-labelledby`.
   *
   * @zh 装饰性的前置图标。以 `aria-hidden` 渲染，绝不充当可访问名称。没有 `children` 时链接为纯图标：一个与自身高度相等的正方形，由 `aria-label` 或 `aria-labelledby` 命名。
   */
  icon?: ReactNode;
  /**
   * Height scale via `controlSize`. Defaults to `"md"`. The steps are
   * `Button`'s, so a link and a button of the same size stand the same height.
   *
   * @zh 通过 `controlSize` 设定的高度阶梯，默认为 `"md"`。这些阶梯与 `Button` 共用，因此同一尺寸的链接与按钮高度一致。
   */
  size?: "sm" | "md" | "lg";
  /**
   * Marks the link as the current destination and emits `aria-current="true"`
   * — a link is a destination rather than a toggle, so it carries no
   * `aria-pressed`. For a link that only wants the highlight, use
   * `look="primary"`.
   *
   * @zh 把链接标记为当前所在的目标，并发出 `aria-current="true"`——链接是目标而非切换控件，因此不会带 `aria-pressed`。若只需要高亮，改用 `look="primary"`。
   */
  isActive?: boolean;
  /**
   * Visual look. Omit for the default raised surface.
   *
   * `"primary"` shares `isActive`'s highlight but does not mark the link as
   * current. `"outline"` swaps the fill for a border, `"ghost"` has no surface
   * at all and holds its colour back until hover, for an affordance inline
   * over existing content, and `"danger"` is for the destination that destroys
   * something.
   *
   * @zh 视觉外观。省略则为默认的凸起表面。
   *
   * `"primary"` 与 `isActive` 共用同一种高亮，但不会把链接标记为当前项。`"outline"` 以描边取代填充；`"ghost"` 完全没有表面，颜色在悬停前保持克制，适合置于已有内容之上的行内控件；`"danger"` 用于会破坏内容的目标。
   */
  look?: "primary" | "outline" | "ghost" | "danger";
  /**
   * Id applied to the label span, e.g. to wire an external `aria-labelledby`.
   *
   * @zh 应用在标签 span 上的 id，例如用于关联外部的 `aria-labelledby`。
   */
  labelId?: string;
  /**
   * Link Slot — renders the anchor. Defaults to a plain `<a>`; pass a framework
   * link (`next/link` and friends) to keep client-side navigation without this
   * package depending on a framework.
   *
   * Forward every prop it is handed onto the rendered anchor, or the link loses
   * its look, its press animation, or both.
   *
   * @zh 链接插槽——负责渲染锚点。默认为原生 `<a>`；传入框架自带的链接组件（例如 `next/link`）即可保留客户端导航，且该包本身不依赖任何框架。
   *
   * 请把收到的每一个 prop 都转发到渲染出的锚点上，否则链接会失去外观、按压动画，或两者皆失。
   */
  linkComponent?: ComponentType<AnchorButtonLinkProps>;
  /**
   * StyleX styles merged over the link's own — the config-layer escape hatch.
   *
   * @zh 合并在链接自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A link needs an accessible name (WCAG 4.1.2). When there is no visible
 * `children` to name it, `aria-label` or `aria-labelledby` is required at the
 * type level so icon-only links cannot ship unlabelled.
 */
type AnchorButtonProps = AnchorButtonBaseProps &
  (
    | {
        /**
         * Visible label. Required unless `aria-label` or `aria-labelledby`
         * names an icon-only link.
         *
         * @zh 可见标签。除非用 `aria-label` 或 `aria-labelledby` 为纯图标链接命名，否则必填。
         */
        children: ReactNode;
      }
    | ({ children?: undefined } & (
        | {
            /**
             * Accessible name for an icon-only link. With no `children`,
             * either this or `aria-labelledby` is required.
             *
             * @zh 纯图标链接的可访问名称。没有 `children` 时，它与 `aria-labelledby` 必须二选一。
             */
            "aria-label": string;
            "aria-labelledby"?: undefined;
          }
        | {
            /**
             * Id of the element naming an icon-only link — the alternative to
             * `aria-label` when there are no `children`.
             *
             * @zh 为纯图标链接命名的元素 id——没有 `children` 时，它是 `aria-label` 的替代。
             */
            "aria-labelledby": string;
            "aria-label"?: undefined;
          }
      ))
  );

/** A destination drawn as a button, composed from `Button`'s own styles. */
export function AnchorButton({
  bright,
  children,
  css,
  hideLabelOnMobile,
  href,
  icon,
  isActive,
  labelId,
  linkComponent: LinkComponent = PlainAnchor,
  ref: forwardedRef,
  size = "md",
  look,
  ...restProps
}: AnchorButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const setAnchorRef = mergeRefs(anchorRef, forwardedRef);

  // Truthiness, not a null check, so `icon={count && <Icon />}` renders
  // nothing when `count` is `0` instead of a stray icon.
  const hasIcon = !!icon;

  const { isPressed, releasedOutside, pressedCss, handlers } = usePressHandlers(
    {
      targetRef: anchorRef,
      ...restProps,
    },
  );

  return (
    <LinkComponent
      aria-current={isActive === true ? "true" : undefined}
      {...restProps}
      href={href}
      ref={setAnchorRef}
      // The Slot is a component, so the styles travel as a compiled
      // `className`/`style` pair rather than through the `css` prop.
      {...stylex.props(
        sharedStyles.base,
        corner.squircle_round,
        a11y.focusRing,
        styles.anchorButton,
        sizeStyles[size],
        look !== undefined && look !== "primary" && lookStyles[look],
        hasIcon &&
          !!children &&
          (hideLabelOnMobile
            ? sharedStyles.iconOnlyBelowMd
            : sharedStyles.hasIcon),
        hasIcon && !children && sharedStyles.iconOnly,
        bright && sharedStyles.bright,
        // `active` and `bright` set a literal `backgroundColor` that wins over
        // `lookStyles`. `danger` keeps its own fill instead, so a destructive
        // destination doesn't repaint brand-accent when it is the current one.
        (isActive === true || look === "primary") &&
          look !== "danger" &&
          sharedStyles.active,
        isPressed && sharedStyles.pressed,
        isPressed && bright && sharedStyles.pressedBright,
        releasedOutside && sharedStyles.releasedOutside,
        css,
        pressedCss,
      )}
      {...handlers}
    >
      {hasIcon && (
        <span css={sharedStyles.icon} aria-hidden>
          {icon}
        </span>
      )}
      {children && (
        <span
          css={[
            sharedStyles.childrenContainer,
            hideLabelOnMobile && sharedStyles.hideLabelBelowMd,
          ]}
          id={labelId}
        >
          {children}
        </span>
      )}
    </LinkComponent>
  );
}

const styles = stylex.create({
  anchorButton: {
    textDecoration: "none",
    cursor: "pointer",
  },
});
