import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { Anchor } from "#src/links/anchor.tsx";

/** An outcome that ends a flow: what happened, and a link onward. */
export function AuthNotice({
  heading,
  text,
  href,
  linkLabel,
}: {
  heading: string;
  text: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div css={stack.tight}>
      <Heading level={1} look="h2">
        {heading}
      </Heading>
      <Text tone="muted">{text}</Text>
      {href && linkLabel ? <Anchor href={href}>{linkLabel}</Anchor> : null}
    </div>
  );
}
