import { EnvelopeIcon } from "@phosphor-icons/react/dist/ssr/Envelope";
import { TextField } from "@tuja/ui/components/text-field";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/** Label, leading slot, and a filled value — the field's everyday shape. */
export function TextFieldPreview() {
  return (
    <TextField
      size="sm"
      label={t({ en: "Email", zh: "邮箱" })}
      leading={<EnvelopeIcon />}
      defaultValue="ada@example.com"
      css={previewLayout.fill}
    />
  );
}
