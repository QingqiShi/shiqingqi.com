"use client";

import { Text } from "@tuja/ui/components/text";
import { Anchor } from "#src/links/anchor.tsx";
import { splitLinks } from "./split-links.ts";

/** The note of a to-do, with each web address in it as a link that opens in a new tab. */
export function NoteText({
  text,
  clamped,
}: {
  text: string;
  /** Show the first two lines, where the editor shows the rest. */
  clamped: boolean;
}) {
  return (
    <Text
      as="p"
      look="bodySmall"
      tone="muted"
      verbatim
      lines={clamped ? 2 : undefined}
    >
      {splitLinks(text).map((part, index) =>
        part.href ? (
          <Anchor key={index} href={part.href} target="_blank">
            {part.text}
          </Anchor>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}
