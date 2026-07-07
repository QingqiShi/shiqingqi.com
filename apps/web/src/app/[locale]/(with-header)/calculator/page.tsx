import * as stylex from "@stylexjs/stylex";
import { Calculator } from "#src/components/calculator/calculator.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <h1 css={styles.srOnly}>{t({ en: "Calculator", zh: "计算器" })}</h1>
      <Calculator />
    </>
  );
}

const styles = stylex.create({
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
