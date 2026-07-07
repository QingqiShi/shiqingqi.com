import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { border, color, font, space } from "../tokens.stylex.ts";

type CalloutVariant =
  "info" | "success" | "warning" | "danger" | "accent" | "neutral";

/**
 * Shared SVG frame for the built-in glyphs. 256 viewBox and `currentColor`
 * strokes match the Phosphor metrics used elsewhere (see Overlay's CloseIcon),
 * so a caller can swap in a Phosphor icon without a size jump. `1em` box scales
 * with the icon slot's font-size. Decorative — the wrapper carries `aria-hidden`.
 */
function GlyphSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="none">
      {children}
    </svg>
  );
}

/**
 * Inline X glyph for the dismiss affordance — same 256 viewBox / round-capped
 * stroke recipe as Overlay's CloseIcon so the two read identically without the
 * Phosphor dependency. Decorative; the button is named by `dismissLabel`.
 */
function CloseIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="none">
      <path
        d="M56 56 200 200M200 56 56 200"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </svg>
  );
}

// Default leading glyph per variant. Built as tiny inline SVGs using
// `currentColor` so they inherit the variant tint set on the icon slot.
const defaultIcons: { [key in CalloutVariant]: ReactNode } = {
  info: (
    <GlyphSvg>
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
    </GlyphSvg>
  ),
  success: (
    <GlyphSvg>
      <circle cx="128" cy="128" r="96" stroke="currentColor" strokeWidth={16} />
      <path
        d="M84 130 116 162 172 98"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </GlyphSvg>
  ),
  warning: (
    <GlyphSvg>
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
    </GlyphSvg>
  ),
  danger: (
    <GlyphSvg>
      <circle cx="128" cy="128" r="96" stroke="currentColor" strokeWidth={16} />
      <path
        d="M100 100 156 156M156 100 100 156"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </GlyphSvg>
  ),
  accent: (
    <GlyphSvg>
      <path
        d="M128 28C134 92 164 122 228 128 164 134 134 164 128 228 122 164 92 134 28 128 92 122 122 92 128 28Z"
        fill="currentColor"
      />
    </GlyphSvg>
  ),
  neutral: (
    <GlyphSvg>
      <circle cx="128" cy="128" r="40" fill="currentColor" />
    </GlyphSvg>
  ),
};

interface CalloutBaseProps extends Omit<
  ComponentProps<"div">,
  "title" | "role" | "children"
> {
  /**
   * Colour treatment and default glyph. Maps to the semantic surface tint,
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
   * Leading glyph. Defaults to a built-in variant glyph; pass a Phosphor icon
   * (or any node) to override, or `null` to drop the icon entirely. Always
   * rendered decoratively (`aria-hidden`) — the message text carries meaning.
   */
  icon?: ReactNode;
  /**
   * ARIA live role for the box. Defaults to `"alert"` for `danger`/`warning`
   * (assertive — interrupts the screen reader) and `"status"` otherwise
   * (polite). Pass explicitly to override the variant-derived default.
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
 * Inline message / alert box. A token-themed subtle background, matching
 * border, tinted leading glyph, and type hierarchy carry the variant's meaning
 * — deliberately no leading accent bar (DESIGN.md ban). The box itself is the
 * live region (`role="status"`/`"alert"`), so its text is announced.
 *
 * Forwards native `<div>` attributes (`id`, `data-*`, `className`, `style`,
 * `ref`) for escape-hatch composition; `css` is composed last so a caller wins.
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
  className,
  style,
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
      className={className}
      style={style}
      css={[styles.base, surfaceStyles[variant], css]}
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
            styles.dismiss,
          ]}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}

// Icon and dismiss boxes are sized to the title's line box
// (`uiBody × lineHeight_4`) so the glyph optically centres on the first line
// while the box top-aligns with the content column.
const controlLineBox = `calc(${font.uiBody} * ${font.lineHeight_4})`;

const styles = stylex.create({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: space._2,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_3,
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
    borderRadius: border.radius_1,
    color: { default: color.textMuted, ":hover": color.textMain },
  },
});

// Subtle tinted background + matching border per variant.
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

// Readable variant colour for the icon tint and the title.
const accentStyles = stylex.create({
  info: { color: color.infoText },
  success: { color: color.successText },
  warning: { color: color.warningText },
  danger: { color: color.dangerText },
  accent: { color: color.accentText },
  neutral: { color: color.textMain },
});
