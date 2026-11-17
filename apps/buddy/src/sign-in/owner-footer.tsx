import * as stylex from "@stylexjs/stylex";
import { cluster, row } from "@tuja/ui/primitives/stack.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import { SignOutButton } from "./sign-out-button.tsx";

/** The foot of the owner's pages: links to the owner's other pages, and sign-out. */
export function OwnerFooter({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div css={[row.item, styles.footer]}>
      <div css={cluster.item}>
        {links.map(({ href, label }) => (
          <Anchor key={href} href={href}>
            {label}
          </Anchor>
        ))}
      </div>
      <SignOutButton />
    </div>
  );
}

const styles = stylex.create({
  footer: {
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
});
