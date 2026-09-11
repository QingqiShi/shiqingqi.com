import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { DotOutlineIcon } from "@phosphor-icons/react/dist/ssr/DotOutline";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";
import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { corner } from "../../primitives/corner.stylex.ts";
import { transition } from "../../primitives/motion.stylex.ts";
import { buttonReset } from "../../primitives/reset.stylex.ts";
import { border, color, font, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";

type CalloutIntent =
  "info" | "success" | "warning" | "danger" | "accent" | "neutral";

const defaultIcons: { [key in CalloutIntent]: ReactNode } = {
  info: <InfoIcon />,
  success: <CheckCircleIcon />,
  warning: <WarningIcon />,
  danger: <XCircleIcon />,
  accent: <SparkleIcon weight="fill" />,
  neutral: <DotOutlineIcon weight="fill" />,
};

interface CalloutBaseProps extends Omit<
  ComponentProps<"div">,
  "title" | "role" | "children" | "className" | "style"
> {
  /**
   * Intent and default icon. Maps to the Intent's surface tint,
   * matching border, and readable text token. Defaults to `"info"`.
   *
   * @zh 意图色与默认图标。对应该意图色的浅色背景、匹配边框与可读文本令牌。
   */
  intent?: CalloutIntent;
  /**
   * Optional bold heading rendered above the body. Omit for a single-line
   * message.
   *
   * @zh 正文上方的可选加粗标题。省略即为单行消息。
   */
  title?: ReactNode;
  /**
   * Body content. Keep it short — a callout is a summary, not a paragraph.
   *
   * @zh 正文内容。保持简短——提示框是摘要，而非段落。
   */
  children: ReactNode;
  /**
   * Leading icon. Defaults to a Phosphor icon for the intent; pass a
   * different Phosphor icon (or any node) to override, or `null` to remove
   * it. Always rendered `aria-hidden` — the message text carries meaning.
   *
   * @zh 前置图标。默认使用该意图色对应的 Phosphor 图标；传入其他 Phosphor 图标（或任意节点）即可覆盖，传入 `null` 可移除。始终以 `aria-hidden` 渲染——含义由文字承载。
   */
  icon?: ReactNode;
  /**
   * ARIA live role for the box. Defaults to `"alert"` for `danger`/`warning`
   * (assertive — interrupts the screen reader) and `"status"` otherwise
   * (polite).
   *
   * @zh 提示框的 ARIA live 角色。`danger`/`warning` 默认为 `alert`（强制式——打断屏幕阅读器），其余默认为 `status`（礼貌式）。
   */
  role?: "status" | "alert";
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh StyleX 覆盖样式，最后合成，使调用方可以覆盖默认值。
   */
  css?: StyleProp;
}

/**
 * A dismiss affordance needs an accessible name, so `dismissLabel` is required
 * at the type level whenever `onDismiss` is set (and forbidden otherwise).
 */
type CalloutDismissProps =
  | {
      /**
       * Called when the user activates the close button.
       *
       * @zh 当用户激活关闭按钮时调用。
       */
      onDismiss: () => void;
      /**
       * Accessible name for the close button — the package ships no i18n.
       *
       * @zh 关闭按钮的无障碍名称——本包不内置 i18n。
       */
      dismissLabel: string;
    }
  | { onDismiss?: undefined; dismissLabel?: undefined };

type CalloutProps = CalloutBaseProps & CalloutDismissProps;

/**
 * Inline message / alert box: a token-themed subtle background, matching
 * border, tinted icon, and type hierarchy carry the intent's meaning, with
 * deliberately no leading accent bar (DESIGN.md ban).
 *
 * The box itself is the live region (`role="status"`/`"alert"`), so its text
 * is announced.
 */
export function Callout({
  intent = "info",
  title,
  children,
  icon,
  role,
  onDismiss,
  dismissLabel,
  css,
  ref,
  ...restProps
}: CalloutProps) {
  const resolvedRole =
    role ?? (intent === "danger" || intent === "warning" ? "alert" : "status");
  const resolvedIcon = icon === undefined ? defaultIcons[intent] : icon;

  return (
    <div
      {...restProps}
      ref={ref}
      role={resolvedRole}
      css={[corner.radius_3, styles.base, surfaceStyles[intent], css]}
    >
      {resolvedIcon != null ? (
        <span css={[styles.icon, accentStyles[intent]]} aria-hidden>
          {resolvedIcon}
        </span>
      ) : null}
      <div css={styles.content}>
        {title != null ? (
          <div css={[styles.title, accentStyles[intent]]}>{title}</div>
        ) : null}
        <div css={styles.body}>{children}</div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          css={[
            buttonReset.base,
            a11y.focusRing,
            transition.colors,
            corner.radius_1,
            styles.dismiss,
          ]}
        >
          <XIcon weight="bold" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

// Sized to the title's line box (`uiBody × lineHeight_4`), so the icon
// centres on the first line and the box top-aligns with the content.
const controlLineBox = `calc(${font.uiBody} * ${font.lineHeight_4})`;

const styles = stylex.create({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: space._2,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    color: color.textMain,
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: font.uiBody,
    blockSize: controlLineBox,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    flexGrow: 1,
    // Let long words wrap instead of forcing the flex row wider.
    minInlineSize: 0,
  },
  title: {
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_4,
  },
  body: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMain,
  },
  dismiss: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: font.uiBody,
    blockSize: controlLineBox,
    inlineSize: controlLineBox,
    color: { default: color.textMuted, ":hover": color.textMain },
  },
});

const surfaceStyles = stylex.create({
  info: {
    backgroundColor: color.surfaceInfoSubtle,
    borderColor: color.infoBorder,
  },
  success: {
    backgroundColor: color.surfaceSuccessSubtle,
    borderColor: color.successBorder,
  },
  warning: {
    backgroundColor: color.surfaceWarningSubtle,
    borderColor: color.warningBorder,
  },
  danger: {
    backgroundColor: color.surfaceDangerSubtle,
    borderColor: color.dangerBorder,
  },
  accent: {
    backgroundColor: color.surfaceAccentSubtle,
    borderColor: color.accentBorder,
  },
  neutral: {
    backgroundColor: color.surfaceNeutralSubtle,
    borderColor: color.neutralBorder,
  },
});

const accentStyles = stylex.create({
  info: { color: color.infoText },
  success: { color: color.successText },
  warning: { color: color.warningText },
  danger: { color: color.dangerText },
  accent: { color: color.accentText },
  neutral: { color: color.textMain },
});
