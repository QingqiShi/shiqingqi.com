# @tuja/ui

The [StyleX](https://stylexjs.com) design system behind
[qingqi.dev](https://qingqi.dev): `light-dark()` color tokens, a generated HCT
palette, composable style primitives, and accessible React components.

> **Live showcase:** <https://qingqi.dev/en/design-system>

The package is not published. Only apps and packages in this workspace use it,
as raw TypeScript source that each consumer compiles with the StyleX Babel
plugin. `apps/web` shows the setup.

## Usage

Import each export from its own subpath; there is no barrel. Style through the
`css` prop: components do not accept `className` or `style`.

```tsx
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  card: { padding: space._4, backgroundColor: color.bgSurface },
});

export function Example() {
  return (
    <div css={[flex.col, styles.card]}>
      <Button look="primary">Save</Button>
    </div>
  );
}
```

## License

MIT © Qingqi Shi
