"use client";

import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";

interface FieldLabelProps {
  id?: string;
  /** Marks a value the Payee's last Transaction filled in. */
  fromLastTime?: boolean;
  children: ReactNode;
}

/** The name above an editor field that is not a `TextField`, with the "from last time" mark. */
export function FieldLabel({ id, fromLastTime, children }: FieldLabelProps) {
  return (
    <span css={cluster.tight}>
      <span id={id} css={[typeRole.control, styles.label]}>
        {children}
      </span>
      {fromLastTime ? (
        <Badge intent="neutral" size="sm">
          {t({ en: "From last time", zh: "沿用上次" })}
        </Badge>
      ) : null}
    </span>
  );
}

const styles = stylex.create({
  label: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
});
