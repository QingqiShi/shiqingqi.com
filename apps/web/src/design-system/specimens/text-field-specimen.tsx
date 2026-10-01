import { EnvelopeIcon } from "@phosphor-icons/react/dist/ssr/Envelope";
import { TextField } from "@tuja/ui/components/text-field";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Label, leading slot, and a filled value — the field's everyday shape. The
 * value stays short because an `<input>` cannot wrap and the narrowest overview
 * tile clips anything longer.
 */
export function TextFieldSpecimen() {
  return (
    <TextField
      size="sm"
      label={t({ en: "Email", zh: "邮箱" })}
      leading={<EnvelopeIcon />}
      defaultValue="ada@mail.test"
      css={specimenLayout.fill}
    />
  );
}
