import { t } from "@tuja/i18n";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { Calculator } from "#src/calculator/calculator.tsx";

export default function Page() {
  return (
    <>
      <h1 css={a11y.srOnly}>{t({ en: "Calculator", zh: "计算器" })}</h1>
      <Calculator />
    </>
  );
}
