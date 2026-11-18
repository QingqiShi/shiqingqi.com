import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { a11y } from "../primitives/a11y.stylex.ts";

const WORD_JOINER = String.fromCharCode(0x2060);

interface ExternalLinkIndicatorProps {
  /**
   * Screen-reader text that says the link opens in a new tab, such as
   * "(opens in new tab)". Required — the package ships no i18n, so the
   * consumer supplies the localized string.
   *
   * @zh 告知读屏用户该链接会在新标签页中打开的文字，例如“(在新标签页中打开)”。必填——该包不内置 i18n，由使用方提供本地化文案。
   */
  label: string;
}

/** The icon and screen-reader text that mark a link which opens in a new tab. */
export function ExternalLinkIndicator({ label }: ExternalLinkIndicatorProps) {
  return (
    <>
      {/* A line can break before an icon, also after a no-break character.
          The word joiner keeps the icon with the last word, and the nowrap
          span removes the break between the joiner and the icon. */}
      <span aria-hidden="true" css={styles.keepWithText}>
        {WORD_JOINER}
        <ArrowSquareOutIcon weight="regular" {...stylex.props(styles.icon)} />
      </span>
      <span css={a11y.srOnly}>{label}</span>
    </>
  );
}

const styles = stylex.create({
  keepWithText: {
    whiteSpace: "nowrap",
  },
  // The indicator is smaller than the link text, so that it stays quiet.
  icon: {
    inlineSize: "0.85em",
    blockSize: "0.85em",
    verticalAlign: "baseline",
    position: "relative",
    top: "0.1em",
    left: "0.1em",
    opacity: 0.7,
  },
});
