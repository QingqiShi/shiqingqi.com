import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { Calculator } from "#src/components/calculator/calculator.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <h1 css={a11y.srOnly}>{t({ en: "Calculator", zh: "计算器" })}</h1>
      <Calculator />
    </>
  );
}
