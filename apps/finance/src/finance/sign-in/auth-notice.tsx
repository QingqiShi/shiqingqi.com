import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { Anchor } from "#src/links/anchor.tsx";

/** A sign-in page's outcome that ends the flow: what happened, and a link onward. */
export function AuthNotice({
  heading,
  text,
  href,
  linkLabel,
}: {
  heading: string;
  text: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div css={stack.tight}>
      <Heading level={1} look="h2">
        {heading}
      </Heading>
      <Text tone="muted">{text}</Text>
      <Anchor href={href}>{linkLabel}</Anchor>
    </div>
  );
}
