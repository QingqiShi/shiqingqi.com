import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import Link from "next/link";
import { globalStyles } from "#src/app/global-styles.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { themeHack } from "#src/utils/theme-hack.ts";

export const metadata: Metadata = {
  title: "404 | Qingqi Shi",
  description:
    "You're looking for a page about Qingqi Shi that doesn't exist. 您正在寻找的石清琪的页面不存在。",
  // Belt-and-braces with the 404 status code — compliant crawlers already
  // drop the URL on status, but non-compliant AI scrapers and social-preview
  // unfurlers read metadata regardless. `noindex, nofollow` keeps the
  // title/description out of those pipelines. Mirrors PR #2190's playground.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body css={[globalStyles.body, styles.body]}>
        {/* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- Theme initialization before hydration */}
        <script dangerouslySetInnerHTML={{ __html: themeHack }} />
        <div css={styles.container}>
          <h1 css={styles.heading}>404</h1>
          <p css={styles.description}>Page not found</p>
          <p css={styles.description} lang="zh">
            页面未找到
          </p>
          <Link href="/" css={styles.link}>
            <span>Go home</span> / <span lang="zh">返回首页</span>
          </Link>
        </div>
      </body>
    </html>
  );
}

const styles = stylex.create({
  body: {
    margin: 0,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
    textAlign: "center",
    padding: space._4,
  },
  heading: {
    fontSize: font.vpHeading1,
    fontWeight: font.weight_7,
    margin: 0,
  },
  description: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: `${space._1} 0 0`,
  },
  link: {
    fontSize: font.uiBody,
    color: color.controlActive,
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
    marginTop: space._5,
    fontWeight: font.weight_5,
  },
});
