import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";

/** A Settings section (level 2) or a part of one with a title of its own (level 3). */
export function SettingsSection({
  level,
  title,
  description,
  children,
}: {
  level: 2 | 3;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const panel = level === 2;
  return (
    <section css={panel ? stack.group : stack.item}>
      <div css={panel ? stack.tight : stack.text}>
        <Heading level={level} look={panel ? "h2" : "h4"}>
          {title}
        </Heading>
        {description ? (
          <Text look="bodySmall" tone="muted">
            {description}
          </Text>
        ) : null}
      </div>
      {children}
    </section>
  );
}
