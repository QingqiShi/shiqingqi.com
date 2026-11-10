import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";

/**
 * A Settings section (level 2) or a part of one with a title of its own (level
 * 3). A part's title is a step above the labels of its fields, and its
 * description is help text, like a field's.
 */
export function SettingsSection({
  level,
  title,
  description,
  children,
}: {
  level: 2 | 3;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const panel = level === 2;
  return (
    <section css={panel ? stack.group : stack.item}>
      <div css={panel ? stack.tight : stack.text}>
        <Heading level={level} look={panel ? "h1" : "h2"}>
          {title}
        </Heading>
        {description ? (
          <Text as="p" look="bodySmall" tone="muted">
            {description}
          </Text>
        ) : null}
      </div>
      {children}
    </section>
  );
}
