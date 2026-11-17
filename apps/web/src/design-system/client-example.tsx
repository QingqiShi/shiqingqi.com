"use client";

import { t } from "@tuja/i18n";
import { ExampleFrame, type ExampleProps } from "./example-frame.tsx";

/**
 * The `Example` for a client module, whose preview holds state. Import it as
 * `Example`, because the Babel plugin finds an example by that name.
 */
export function ClientExample(props: ExampleProps) {
  return <ExampleFrame {...props} codeLabel={t({ en: "Code", zh: "代码" })} />;
}
