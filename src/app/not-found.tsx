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
};

export default function NotFound() {
  return (
    <html suppressHydrationWarning>
      <body css={[globalStyles.body, styles.body]}>
        {/* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- Theme initialization before hydration */}
        <script dangerouslySetInnerHTML={{ __html: themeHack }} />
        <div css={styles.container}>
          <h1 css={styles.heading}>404</h1>
          <p css={styles.description}>Page not found</p>
          <p css={styles.description}>页面未找到</p>
          <Link href="/" css={styles.link}>
            Go home / 返回首页
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
