import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { corner } from "../../primitives/corner.stylex.ts";
import { border, color, font, shadow, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";

interface AvatarBaseProps extends Omit<
  ComponentProps<"span">,
  "children" | "role" | "aria-label" | "className" | "style"
> {
  /**
   * Who the avatar stands for, and the source of the derived monogram when
   * there is no `src` or `initials`. Keep it to the person — anything the
   * `badge` means belongs in `badgeLabel`.
   *
   * @zh 该头像所代表的人；在没有 `src` 或 `initials` 时，也是字母缩写的推导来源——只应写这个人本身，`badge` 的含义放到 `badgeLabel` 中。
   */
  name: string;
  /**
   * Portrait layered over the monogram, rendered decoratively since the root
   * already carries the accessible name. A URL that 404s falls back to the
   * monogram with no error handling needed at the callsite; keep the
   * portrait opaque, since a transparent pixel lets the monogram show
   * through it too.
   *
   * @zh 叠加在字母缩写之上的头像图片，以装饰性方式渲染，因为根元素已承载无障碍名称。可能 404 的地址无需在调用处额外处理——加载失败时字母缩写会显现；请保持头像不透明，否则透明像素会让字母缩写透出。
   */
  src?: string;
  /**
   * Overrides the derived monogram, e.g. when the derivation picks the wrong
   * characters or two would crowd. An empty string counts as no override.
   *
   * @zh 覆盖推导出的字母缩写，例如推导结果选错了字符，或两个字符显得拥挤时。空字符串视为未覆盖。
   */
  initials?: string;
  /**
   * Diameter and type scale, in rem so the medallion scales with the user's
   * font size.
   *
   * @zh 直径与字号阶梯，以 rem 为单位，使头像随用户字号缩放。
   */
  size?: "sm" | "md" | "lg";
  /**
   * `"subtle"` (the default) is a quiet tinted medallion for anyone present.
   * `"solid"` inverts it, so the people a view is actually about stand out
   * from a row of their peers.
   *
   * @zh 柔和（默认）是低调的着色样式，代表在场但非重点的人；实心则反转配色，让视图真正关注的人从同伴中脱颖而出。
   */
  look?: "subtle" | "solid";
  /**
   * StyleX overrides merged over the root — composed last so a caller wins.
   *
   * @zh 合并在根元素样式之上的 StyleX 覆盖样式——最后合成，因此调用方能够覆盖默认值。
   */
  css?: StyleProp;
}

/**
 * The badge is drawn, so it needs no screen-reader text of its own.
 * `badgeLabel` is therefore required at the type level when `badge` is set,
 * and forbidden otherwise.
 */
type AvatarBadgeProps =
  | {
      /**
       * Corner marker on its own surface — a status dot, a small icon. Drawn
       * `aria-hidden`; `badgeLabel` carries its meaning instead, and is
       * required whenever `badge` is set.
       *
       * @zh 位于角落、拥有独立表面的标记——例如状态点或小图标。以 `aria-hidden` 绘制；含义由 `badgeLabel` 承载，且设置 `badge` 时必须同时提供。
       */
      badge: ReactNode;
      /**
       * What the badge means, appended to the avatar's accessible name — the
       * package ships no i18n, so the consumer supplies the localised
       * string. Required whenever `badge` is set, and omitted otherwise.
       *
       * @zh 角标的含义，会追加到头像的无障碍名称之后——该包不提供 i18n，需由调用方给出已本地化的字符串。设置 `badge` 时必填，未设置时不可传入。
       */
      badgeLabel: string;
    }
  | { badge?: undefined; badgeLabel?: undefined };

type AvatarProps = AvatarBaseProps & AvatarBadgeProps;

/** Array.from takes an astral-plane character whole, unlike string indexing. */
function monogramFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0] ?? "";
  if (words.length === 1) return first;
  const last = Array.from(words[words.length - 1])[0] ?? "";
  return first + last;
}

/**
 * A circular medallion for one person: their portrait, or else a monogram
 * derived from their name, with an optional badge in the corner.
 */
export function Avatar({
  name,
  src,
  initials,
  size = "md",
  look = "subtle",
  badge,
  badgeLabel,
  css,
  ...restProps
}: AvatarProps) {
  // `||`, not `??`: an empty `initials` string has no override to honour, so
  // it falls through to the derived monogram.
  const monogram = initials || monogramFrom(name);
  // Truthiness: `badge={person.isVerified && <CheckIcon />}` yields `false`
  // when absent, which `!= null` would wrongly call present.
  const hasBadge = Boolean(badge);
  // Space-separated rather than punctuated: the separator would have to be
  // localized, and screen readers already pause between the two runs.
  const label =
    hasBadge && badgeLabel !== undefined ? `${name} ${badgeLabel}` : name;
  const isNamed = label.trim() !== "";
  // `role="img"` tracks whether anything is drawn, not just whether `name` is
  // set. An empty span drops the role; a drawn one keeps it, since an unnamed
  // image fails WCAG 1.1.1.
  const isDrawn = src !== undefined || monogram !== "";
  const isImage = isNamed || isDrawn;

  return (
    <span
      {...restProps}
      role={isImage ? "img" : undefined}
      aria-label={isNamed ? label : undefined}
      css={[styles.root, sizeStyles[size], css]}
    >
      <span
        css={[corner.radius_round, styles.medallion, lookStyles[look]]}
        aria-hidden
      >
        {monogram}
        {src === undefined ? null : (
          // Decorative: the root already carries the accessible name, so an
          // `alt` here would announce the person twice.
          <img src={src} alt="" css={styles.image} />
        )}
      </span>
      {hasBadge ? (
        <span
          css={[corner.radius_round, styles.badge, badgeSizeStyles[size]]}
          aria-hidden
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}

const styles = stylex.create({
  // Not clipped, so the badge can hang off the medallion's edge.
  root: {
    position: "relative",
    display: "inline-flex",
    flexShrink: 0,
    verticalAlign: "middle",
  },
  medallion: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    blockSize: "100%",
    overflow: "hidden",
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_0,
    userSelect: "none",
  },
  // No background, on purpose: a failed portrait paints nothing, so the
  // monogram underneath still shows through with no `onError` handler
  // needed. A background would repaint over the monogram whenever the image
  // fails or hasn't loaded yet.
  image: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: "100%",
    blockSize: "100%",
    objectFit: "cover",
  },
  badge: {
    position: "absolute",
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "translate(25%, 25%)",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
    color: color.textMain,
    boxShadow: shadow._1,
  },
});

// rem-based, like Spinner's diameters, so sizing scales with the user's font
// size (WCAG 1.4.4) instead of a fixed pixel grid.
const sizeStyles = stylex.create({
  sm: {
    inlineSize: space._5,
    blockSize: space._5,
    fontSize: font.uiOverline,
  },
  md: {
    inlineSize: space._7,
    blockSize: space._7,
    fontSize: font.uiCaption,
  },
  lg: {
    inlineSize: space._8,
    blockSize: space._8,
    fontSize: font.uiBody,
  },
});

// The badge stays legible below a certain size, so `sm` and `md` share one
// diameter and only `lg` steps up.
const badgeSizeStyles = stylex.create({
  sm: {
    inlineSize: space._3,
    blockSize: space._3,
    fontSize: font.uiOverline,
  },
  md: {
    inlineSize: space._3,
    blockSize: space._3,
    fontSize: font.uiOverline,
  },
  lg: {
    inlineSize: space._4,
    blockSize: space._4,
    fontSize: font.uiCaption,
  },
});

const lookStyles = stylex.create({
  subtle: {
    backgroundColor: color.neutralSurface,
    color: color.textMuted,
    boxShadow: `inset 0 0 0 ${border.size_1} ${color.neutralBorder}`,
  },
  solid: {
    backgroundColor: color.bgInverse,
    color: color.textOnInverse,
  },
});
