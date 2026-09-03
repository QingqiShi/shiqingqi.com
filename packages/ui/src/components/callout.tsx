import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { border, color, font, space } from "../tokens.stylex.ts";
import { CloseIcon } from "./close-icon.tsx";
import { IconSvg } from "./icon-svg.tsx";

type CalloutVariant =
  "info" | "success" | "warning" | "danger" | "accent" | "neutral";

const defaultIcons: { [key in CalloutVariant]: ReactNode } = {
  info: (
    <IconSvg>
      <circle cx="128" cy="128" r="96" stroke="currentColor" strokeWidth={16} />
      <line
        x1="128"
        y1="120"
        x2="128"
        y2="176"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
      <circle cx="128" cy="84" r="11" fill="currentColor" />
    </IconSvg>
  ),
  success: (
    <IconSvg>
      <circle cx="128" cy="128" r="96" stroke="currentColor" strokeWidth={16} />
      <path
        d="M84 130 116 162 172 98"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  ),
  warning: (
    <IconSvg>
      <path
        d="M128 44 226 212 30 212Z"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinejoin="round"
      />
      <line
        x1="128"
        y1="112"
        x2="128"
        y2="160"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
      <circle cx="128" cy="186" r="11" fill="currentColor" />
    </IconSvg>
  ),
  danger: (
    <IconSvg>
      <circle cx="128" cy="128" r="96" stroke="currentColor" strokeWidth={16} />
      <path
        d="M100 100 156 156M156 100 100 156"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </IconSvg>
  ),
  accent: (
    <IconSvg>
      <path
        d="M128 28C134 92 164 122 228 128 164 134 134 164 128 228 122 164 92 134 28 128 92 122 122 92 128 28Z"
        fill="currentColor"
      />
    </IconSvg>
  ),
  neutral: (
    <IconSvg>
      <circle cx="128" cy="128" r="40" fill="currentColor" />
    </IconSvg>
  ),
};

interface CalloutBaseProps extends Omit<
  ComponentProps<"div">,
  "title" | "role" | "children" | "className" | "style"
> {
  /**
   * Intent and default icon. Maps to the Intent's surface tint,
   * matching border, and readable text token. Defaults to `"info"`.
   */
  variant?: CalloutVariant;
  /**
   * Optional bold heading rendered above the body. Omit for a single-line
   * message.
   */
  title?: ReactNode;
  /** Body content. Keep it short — a callout is a summary, not a paragraph. */
  children: ReactNode;
  /**
   * Leading icon. Defaults to a built-in variant icon; pass a Phosphor icon
   * (or any node) to override, or `null` to remove it. Always rendered
   * `aria-hidden` — the message text carries meaning.
   */
  icon?: ReactNode;
  /**
   * ARIA live role for the box. Defaults to `"alert"` for `danger`/`warning`
   * (assertive — interrupts the screen reader) and `"status"` otherwise
   * (polite).
   */
  role?: "status" | "alert";
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
}

/**
 * A dismiss affordance needs an accessible name, so `dismissLabel` is required
 * at the type level whenever `onDismiss` is set (and forbidden otherwise).
 */
type CalloutDismissProps =
  | {
      /** Called when the user activates the close button. */
      onDismiss: () => void;
      /** Accessible name for the close button — the package ships no i18n. */
      dismissLabel: string;
    }
  | { onDismiss?: undefined; dismissLabel?: undefined };

type CalloutProps = CalloutBaseProps & CalloutDismissProps;

/**
 * Inline message / alert box: a token-themed subtle background, matching
 * border, tinted icon, and type hierarchy carry the variant's meaning, with
 * deliberately no leading accent bar (DESIGN.md ban).
 *
 * The box itself is the live region (`role="status"`/`"alert"`), so its text
 * is announced.
 */
export function Callout({
  variant = "info",
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
    role ??
    (variant === "danger" || variant === "warning" ? "alert" : "status");
  const resolvedIcon = icon === undefined ? defaultIcons[variant] : icon;

  return (
    <div
      {...restProps}
      ref={ref}
      role={resolvedRole}
      css={[corner.radius_3, styles.base, surfaceStyles[variant], css]}
    >
      {resolvedIcon != null ? (
        <span css={[styles.icon, accentStyles[variant]]} aria-hidden>
          {resolvedIcon}
        </span>
      ) : null}
      <div css={styles.content}>
        {title != null ? (
          <div css={[styles.title, accentStyles[variant]]}>{title}</div>
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
          <CloseIcon />
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
