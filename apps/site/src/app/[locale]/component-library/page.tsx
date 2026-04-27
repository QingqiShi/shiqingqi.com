import * as stylex from "@stylexjs/stylex";
import { ViewTransition } from "react";
import { t } from "#src/i18n.ts";
import { font, space } from "#src/tokens.stylex.ts";

export default function ComponentLibrary() {
  const heading = t({ en: "Component Library", zh: "组件库" });

  return (
    <div css={styles.container}>
      <ViewTransition name={`project-card-name-${heading}`}>
        <h1 css={styles.heading}>{heading}</h1>
      </ViewTransition>
      <p css={styles.message}>
        {t({
          en: "Coming soon. Stay tuned for beautiful, reusable components crafted with care.",
          zh: "即将推出。敬请期待精心打造的精美、可重用组件。",
        })}
      </p>
    </div>
  );
}

const styles = stylex.create({
  container: {
    padding: `${space._6} 0`,
  },
  heading: {
    margin: `0 0 ${space._4} 0`,
    fontSize: font.vpHeading1,
    fontWeight: font.weight_8,
  },
  message: {
    margin: 0,
    fontSize: font.vpHeading3,
  },
});
