"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Spinner } from "../feedback/spinner.tsx";
import { usePressHandlers } from "../hooks/use-press-handlers.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { color, opacity } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  lookStyles,
  sharedStyles,
  sizeStyles,
} from "./button-shared.stylex.ts";
import { useLinkSlot, type LinkSlot } from "./link-provider.tsx";
import { outlineSurface } from "./outline-surface.stylex.ts";

interface SharedProps {
  /**
   * Below the `md` breakpoint, collapses to a square icon-only button and
   * hides the label. Pass `aria-label` too, so the collapsed form keeps its
   * name.
   *
   * @zh 在 `md` 断点以下收起为纯图标的正方形按钮，并隐藏标签。同时提供 `aria-label`，使收起后的按钮仍保留名称。
   */
  hideLabelOnMobile?: boolean;
  /**
   * Decorative leading icon. Rendered `aria-hidden`; never the accessible
   * name. With no `children` the button is icon-only: a square of its own
   * height, named by `aria-label` or `aria-labelledby`.
   *
   * @zh 装饰性的前置图标。以 `aria-hidden` 渲染，绝不充当可访问名称。没有 `children` 时按钮为纯图标：一个与自身高度相等的正方形，由 `aria-label` 或 `aria-labelledby` 命名。
   */
  icon?: ReactNode;
  /**
   * Trailing content, such as a count, a note or a caret. Unlike `icon` it
   * stays in the accessibility tree, so it reads as part of the button's name.
   *
   * @zh 尾部内容，例如计数、备注或箭头。与 `icon` 不同，它保留在无障碍树中，因此会作为按钮名称的一部分被朗读。
   */
  trailing?: ReactNode;
  /**
   * Height scale via `controlSize`. `"xs"` is for a dense row, such as a line
   * of filters, and keeps its label on one line.
   *
   * Under a coarse pointer every size takes a tap across at least 44px (WCAG
   * 2.5.8), even where it draws smaller, as `"sm"` does.
   *
   * @zh 通过 `controlSize` 设定的高度阶梯。`"xs"` 用于紧凑的一行，例如一排筛选项，其标签保持单行。
   *
   * 在粗指针设备上，每个尺寸都能在至少 44px 的范围内响应点按（WCAG 2.5.8），即使它绘制得更小，例如 `"sm"`。
   *
   * @default "md"
   */
  size?: "xs" | "sm" | "md" | "lg";
  /**
   * Toggles the active highlight. A button emits `aria-pressed`, for a toggle.
   * A link emits `aria-current="true"`, for the current destination, unless you
   * pass your own `aria-current`. For a call to action that only wants the
   * highlight, use `look="primary"`.
   *
   * @zh 切换激活高亮。按钮发出 `aria-pressed`，用于切换状态。链接发出 `aria-current="true"`，用于当前所在的目标，除非你自己传入 `aria-current`。若某个 CTA 只需要高亮，改用 `look="primary"`。
   */
  isActive?: boolean;
  /**
   * Visual look. Omit for the default raised surface.
   *
   * `"primary"` shares `isActive`'s highlight but does not mark any state.
   * `"outline"` swaps the fill for a border and is the look for a row of
   * filters. `"ghost"` has no surface at all and holds its colour back until
   * hover, for an affordance inline over existing content. `"bright"` lifts
   * the button onto a bright surface that brightens further on hover.
   * `"danger"` is for the action that destroys something.
   *
   * @zh 视觉外观。省略则为默认的凸起表面。
   *
   * `"primary"` 与 `isActive` 共用同一种高亮，但不表示任何状态。`"outline"` 以描边取代填充，是一排筛选项所用的外观；`"ghost"` 完全没有表面，颜色在悬停前保持克制，适合置于已有内容之上的行内控件；`"bright"` 将按钮置于明亮表面，悬停时进一步提亮；`"danger"` 用于真正具有破坏性的操作。
   */
  look?: "primary" | "outline" | "ghost" | "bright" | "danger";
  /**
   * Id applied to the label span, e.g. to wire an external `aria-labelledby`.
   *
   * @zh 应用在标签 span 上的 id，例如用于关联外部的 `aria-labelledby`。
   */
  labelId?: string;
  /**
   * StyleX styles merged over the button's own — the config-layer escape hatch.
   *
   * @zh 合并在按钮自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A button needs an accessible name (WCAG 4.1.2). When there is no visible
 * `children` to name it, `aria-label` or `aria-labelledby` is required at the
 * type level so icon-only buttons cannot ship unlabelled.
 */
type AccessibleName =
  | {
      /**
       * Visible label. Required unless `aria-label` or `aria-labelledby`
       * names an icon-only button.
       *
       * @zh 可见标签。除非用 `aria-label` 或 `aria-labelledby` 为纯图标按钮命名，否则必填。
       */
      children: ReactNode;
    }
  | ({ children?: undefined } & (
      | {
          /**
           * Accessible name for an icon-only button. With no `children`,
           * either this or `aria-labelledby` is required.
           *
           * @zh 纯图标按钮的可访问名称。没有 `children` 时，它与 `aria-labelledby` 必须二选一。
           */
          "aria-label": string;
          "aria-labelledby"?: undefined;
        }
      | {
          /**
           * Id of the element naming an icon-only button — the alternative
           * to `aria-label` when there are no `children`.
           *
           * @zh 为纯图标按钮命名的元素 id——没有 `children` 时，它是 `aria-label` 的替代。
           */
          "aria-labelledby": string;
          "aria-label"?: undefined;
        }
    ));

type NativeButtonProps = Omit<
  ComponentProps<"button">,
  "children" | "className" | "style"
>;

type NativeAnchorProps = Omit<
  ComponentProps<"a">,
  "children" | "className" | "style" | "href" | "type"
>;

/** The form that renders a `<button>`. */
export type ButtonFormProps = SharedProps &
  AccessibleName & {
    /**
     * Destination. With it the button renders a link and takes `target`, `rel`,
     * `download` and `linkComponent`. Without it the button renders a `<button>`
     * and takes `type`, `disabled` and `loading`.
     *
     * @zh 目标地址。有它时按钮渲染为链接，可使用 `target`、`rel`、`download` 与 `linkComponent`。没有它时按钮渲染为 `<button>`，可使用 `type`、`disabled` 与 `loading`。
     */
    href?: undefined;
    /**
     * Shows a spinner, sets `aria-busy`, and blocks activation. Uses `aria-disabled`,
     * not `disabled`, so the button keeps focus and the busy state is announced.
     *
     * The width holds either way: with an icon the spinner takes the icon's
     * place, without one it sits over the label, which keeps its space.
     *
     * @zh 显示加载指示器，设置 `aria-busy`，并阻止再次触发。它用 `aria-disabled` 而非 `disabled`，因此按钮保留焦点，忙碌状态也能被读出。
     *
     * 两种情况下宽度都保持不变：有图标时加载指示器取代图标，没有图标时它覆盖在标签之上，而标签仍占据原有空间。
     */
    loading?: boolean;
    linkComponent?: undefined;
    target?: undefined;
    rel?: undefined;
    download?: undefined;
  } & NativeButtonProps;

type LinkFormProps = SharedProps &
  AccessibleName & {
    href: string;
    /**
     * Link Slot: renders the anchor for this button alone. Without it the
     * button takes the link from the nearest `LinkProvider`, or a plain `<a>`
     * without one.
     *
     * Forward every prop it is handed onto the rendered anchor, or the link
     * loses its look, its press animation, or both.
     *
     * @zh 链接插槽：只为这个按钮渲染锚点。没有它时，按钮使用最近的 `LinkProvider` 提供的链接；没有 provider 时使用原生 `<a>`。
     *
     * 请把收到的每一个 prop 都转发到渲染出的锚点上，否则链接会失去外观、按压动画，或两者皆失。
     */
    linkComponent?: LinkSlot;
  } & NativeAnchorProps;

type ButtonProps = ButtonFormProps | LinkFormProps;

/**
 * A button: a `<a>` when `href` is set, a `<button>` otherwise. Each form takes
 * the native attributes and the ARIA of its element.
 */
export function Button(props: ButtonProps) {
  return props.href === undefined ? (
    <ButtonElement {...props} />
  ) : (
    <LinkElement {...props} />
  );
}

function ButtonElement(props: ButtonFormProps) {
  const { face, native } = splitFace(props);
  const {
    disabled,
    loading,
    onClick,
    onKeyDown,
    ref: forwardedRef,
    type = "button",
    "aria-busy": ariaBusy,
    "aria-disabled": ariaDisabled,
    ...restProps
  } = native;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const setButtonRef = mergeRefs(buttonRef, forwardedRef);

  const isLoading = loading === true;
  // Only `disabled` reaches the DOM attribute; a busy button stays focusable,
  // so the press animation treats both as inert.
  const isInert = disabled === true || isLoading;

  // `aria-disabled` alone stops nothing: pointer events are off while busy,
  // but Enter/Space still fires a click on a focused button. This blocks
  // activation here too.
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  }

  // Keyboard events reach a busy button too, and `pointerEvents` can't stop them.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isLoading) return;
    onKeyDown?.(event);
  }

  const press = usePressHandlers({
    disabled: isInert,
    targetRef: buttonRef,
    ...restProps,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
  });

  return (
    <button
      aria-pressed={face.isActive}
      {...restProps}
      ref={setButtonRef}
      type={type}
      disabled={disabled}
      // Falls back to the caller's value, not `undefined`, since these are
      // set after `{...restProps}` and would otherwise strip a caller-set
      // `aria-busy`/`aria-disabled`.
      aria-disabled={isLoading ? true : ariaDisabled}
      aria-busy={isLoading ? true : ariaBusy}
      css={faceCss(face, press, { isInert, isLoading })}
      {...press.handlers}
    >
      <Face face={face} isLoading={isLoading} />
    </button>
  );
}

// The link Slot comes from a hook and does not change between renders. In JSX,
// the static-components rule cannot see this, so the Slot goes to a second
// component as a prop.
function LinkElement(props: LinkFormProps) {
  const linkSlot = useLinkSlot(props.linkComponent);
  return <SlottedLink {...props} linkComponent={linkSlot} />;
}

function SlottedLink({
  linkComponent: LinkComponent,
  ...props
}: LinkFormProps & { linkComponent: LinkSlot }) {
  const { face, native } = splitFace(props);
  const { href, ref: forwardedRef, ...restProps } = native;
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const setAnchorRef = mergeRefs(anchorRef, forwardedRef);

  const press = usePressHandlers({ targetRef: anchorRef, ...restProps });

  return (
    <LinkComponent
      aria-current={face.isActive === true ? "true" : undefined}
      {...restProps}
      href={href}
      ref={setAnchorRef}
      // The Slot is a component, so the styles travel as a compiled
      // `className`/`style` pair rather than through the `css` prop.
      {...stylex.props(faceCss(face, press))}
      {...press.handlers}
    >
      <Face face={face} />
    </LinkComponent>
  );
}

type FaceProps = SharedProps & { children?: ReactNode };

function splitFace<Props extends FaceProps>({
  children,
  css,
  hideLabelOnMobile,
  icon,
  isActive,
  labelId,
  look,
  size,
  trailing,
  ...native
}: Props) {
  const face: FaceProps = {
    children,
    css,
    hideLabelOnMobile,
    icon,
    isActive,
    labelId,
    look,
    size,
    trailing,
  };
  return { face, native };
}

function paintsHighlight({ isActive, look }: FaceProps) {
  // `danger` keeps its own fill, so a destructive button doesn't repaint
  // brand-accent when toggled on.
  return (isActive === true || look === "primary") && look !== "danger";
}

interface FaceState {
  isInert?: boolean;
  isLoading?: boolean;
}

function faceCss(
  face: FaceProps,
  press: Pick<
    ReturnType<typeof usePressHandlers>,
    "isPressed" | "releasedOutside" | "pressedCss"
  >,
  { isInert = false, isLoading = false }: FaceState = {},
): StyleProp {
  const {
    children,
    css,
    hideLabelOnMobile,
    icon,
    look,
    size = "md",
    trailing,
  } = face;
  const { isPressed, releasedOutside, pressedCss } = press;
  // Truthiness, not a null check, so `icon={count && <Icon />}` renders
  // nothing when `count` is `0` instead of a stray icon.
  const hasIcon = !!icon;
  const isOutline = look === "outline";
  const isPressedLive = isPressed && !isInert;

  return [
    typeRole.control,
    size === "xs" && typeRole.caption,
    size === "sm" && typeRole.label,
    size === "lg" && typeRole.h2,
    a11y.touchTarget,
    sharedStyles.base,
    corner.squircle_round,
    a11y.focusRing,
    styles.button,
    sizeStyles[size],
    look !== undefined && look !== "primary" && lookStyles[look],
    isOutline && outlineSurface.skin,
    hasIcon &&
      !!children &&
      (hideLabelOnMobile ? sharedStyles.iconOnlyBelowMd : sharedStyles.hasIcon),
    hasIcon && !children && !trailing && sharedStyles.iconOnly,
    // `active` and `bright` set a literal `backgroundColor` that wins over
    // the fill of the tokens.
    paintsHighlight(face) &&
      (isOutline ? outlineSurface.active : sharedStyles.active),
    isLoading && styles.busy,
    isPressedLive && sharedStyles.pressed,
    isPressedLive && look === "bright" && sharedStyles.pressedBright,
    releasedOutside && sharedStyles.releasedOutside,
    css,
    pressedCss,
  ];
}

function Face({
  face,
  isLoading = false,
}: {
  face: FaceProps;
  isLoading?: boolean;
}) {
  const { children, hideLabelOnMobile, icon, labelId, look, trailing } = face;
  const hasIcon = !!icon;
  // With an icon, the spinner takes its place. Without one, it overlays the
  // label (kept in the layout via `visibility`) so the button's width holds.
  const swapsIconForSpinner = isLoading && hasIcon;
  const overlaysSpinner = isLoading && !hasIcon;
  // On a filled look there's nothing to mute against, and dimming its text
  // further would drop it below the WCAG 1.4.3 contrast floor.
  const inheritsTrailingColor =
    paintsHighlight(face) || look === "danger" || look === "bright";

  return (
    <>
      {hasIcon && (
        <span css={sharedStyles.icon} aria-hidden>
          {/* `aria-busy` on the button already announces the state, so a
              labelled spinner would say it twice. `size="inline"` matches the
              icon box it replaces, keeping the button's width fixed. */}
          {swapsIconForSpinner ? <Spinner size="inline" aria-hidden /> : icon}
        </span>
      )}
      {children && (
        <span
          css={[
            sharedStyles.childrenContainer,
            hideLabelOnMobile && sharedStyles.hideLabelBelowMd,
            overlaysSpinner && styles.labelHidden,
          ]}
          id={labelId}
        >
          {children}
        </span>
      )}
      {trailing && (
        <span
          css={[
            styles.trailing,
            inheritsTrailingColor && styles.trailingInherited,
            hideLabelOnMobile && sharedStyles.hideLabelBelowMd,
            overlaysSpinner && styles.labelHidden,
          ]}
        >
          {trailing}
        </span>
      )}
      {overlaysSpinner && (
        <span css={styles.spinnerOverlay} aria-hidden>
          <Spinner size="inline" aria-hidden />
        </span>
      )}
    </>
  );
}

const styles = stylex.create({
  button: {
    textDecoration: "none",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: {
      default: null,
      ":disabled": opacity.disabled,
    },
  },
  // A busy button stays enabled, so the `:disabled` rules above never fire.
  // `pointerEvents: none` blocks the pointer instead, and happens to match
  // its cursor; `handleClick`/`handleKeyDown` guard keyboard activation.
  busy: {
    opacity: opacity.disabled,
    pointerEvents: "none",
  },
  // `visibility`, not `opacity`, so the label also leaves the accessibility
  // tree — `aria-busy` is what should be announced.
  labelHidden: {
    visibility: "hidden",
  },
  spinnerOverlay: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    blockSize: "100%",
  },
  trailing: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    color: color.fgMuted,
  },
  trailingInherited: {
    color: "inherit",
  },
});
