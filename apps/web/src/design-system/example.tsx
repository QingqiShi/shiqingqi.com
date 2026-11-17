import { t } from "@tuja/i18n";
import { ExampleFrame, type ExampleProps } from "./example-frame.tsx";

/**
 * A live preview and the code that makes it, in one card: the preview on top,
 * the code under it behind a hairline. The shared frame and the order say that
 * this code makes this preview. The code is the source of the preview, so the
 * two cannot drift apart. For a preview that holds state, use `ClientExample` in a
 * client module.
 */
export function Example(props: ExampleProps) {
  return <ExampleFrame {...props} codeLabel={t({ en: "Code", zh: "代码" })} />;
}
