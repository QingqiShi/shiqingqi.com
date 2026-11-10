import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { DotOutlineIcon } from "@phosphor-icons/react/dist/ssr/DotOutline";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";
import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "../actions/button.tsx";
import { color } from "../color.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { toneColor } from "../primitives/tone.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import {
  border,
  controlHeight,
  font,
  rhythm,
  space,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

type CalloutIntent =
  "info" | "success" | "warning" | "danger" | "accent" | "neutral";

const defaultIcons: { [key in CalloutIntent]: ReactNode } = {
  info: <InfoIcon weight="regular" />,
  success: <CheckCircleIcon weight="regular" />,
  warning: <WarningIcon weight="regular" />,
  danger: <XCircleIcon weight="regular" />,
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
   * One control that acts on the message, such as a small "Reconnect"
   * `Button`. As in a `Toast`, it sits at the end of the message, and goes
   * under it where the box is too narrow for both, such as on a phone.
   *
   * @zh 针对该消息的一个控件，例如小号的「重新连接」`Button`。与 `Toast` 一样，它位于消息末尾；当提示框太窄、两者放不下时（例如在手机上），它移到消息下方。
   */
  action?: ReactNode;
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
 * deliberately no leading accent bar.
 *
 * The box itself is the live region (`role="status"`/`"alert"`), so its text
 * is announced.
 */
export function Callout({
  intent = "info",
  title,
  children,
  action,
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
  const tone = toneColor[intent === "neutral" ? "default" : intent];
  const message = (
    <div css={[stack.text, styles.content, action ? styles.message : null]}>
      {title != null ? (
        <div css={[typeRole.h4, styles.title, tone]}>{title}</div>
      ) : null}
      <div css={[typeRole.bodySmall, styles.body]}>{children}</div>
    </div>
  );

  return (
    <div
      {...restProps}
      ref={ref}
      role={resolvedRole}
      css={[corner.radius_3, styles.base, surfaceStyles[intent], css]}
    >
      {resolvedIcon != null ? (
        <span css={[typeRole.body, styles.icon, tone]} aria-hidden>
          {resolvedIcon}
        </span>
      ) : null}
      {action ? (
        <div css={[styles.content, styles.withAction]}>
          {message}
          <div css={styles.action}>{action}</div>
        </div>
      ) : (
        message
      )}
      {onDismiss ? (
        <Button
          size="sm"
          look="ghost"
          bleed="end"
          icon={<XIcon weight="bold" />}
          aria-label={dismissLabel}
          onClick={onDismiss}
          css={styles.dismiss}
        />
      ) : null}
    </div>
  );
}

// Sized to the title's line box (`uiBody × lineHeightBody`), so the icon
// centres on the first line and the box top-aligns with the content.
const controlLineBox = `calc(${font.uiBody} * ${font.lineHeightBody})`;

const styles = stylex.create({
  // A grid that starts its items keeps each as wide as its content, such as
  // the `below` slot of a `ListRow`. A callout spans its column there too.
  base: {
    display: "flex",
    justifySelf: "stretch",
    alignItems: "flex-start",
    gap: rhythm.tight,
    paddingBlock: space._3,
    paddingInline: space._4,
    borderWidth: border.size_1,
    borderStyle: "solid",
    color: color.fg,
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    blockSize: controlLineBox,
  },
  content: {
    flexGrow: 1,
    // Let long words wrap instead of forcing the flex row wider.
    minInlineSize: 0,
  },
  // The message takes the line while the box is wider than it and the
  // action. In a narrower box, the action goes under the message.
  withAction: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
  },
  message: {
    flexBasis: space._14,
  },
  action: {
    display: "flex",
    flexShrink: 0,
    gap: rhythm.tight,
  },
  title: {
    lineHeight: font.lineHeightBody,
  },
  body: {
    color: color.fg,
  },
  // The button is taller than the first line. It centres on that line, so
  // that it does not push the box taller.
  dismiss: {
    marginBlock: `calc((${controlLineBox} - ${controlHeight.sm}) / 2)`,
  },
});

const surfaceStyles = stylex.create({
  info: {
    backgroundColor: color.bgInfoSubtle,
    borderColor: color.borderInfo,
  },
  success: {
    backgroundColor: color.bgSuccessSubtle,
    borderColor: color.borderSuccess,
  },
  warning: {
    backgroundColor: color.bgWarningSubtle,
    borderColor: color.borderWarning,
  },
  danger: {
    backgroundColor: color.bgDangerSubtle,
    borderColor: color.borderDanger,
  },
  accent: {
    backgroundColor: color.bgAccentSubtle,
    borderColor: color.borderAccent,
  },
  neutral: {
    backgroundColor: color.bgNeutralSubtle,
    borderColor: color.border,
  },
});
