# @tuja/component-playground

Builds a single-file HTML playground for one `@tuja/ui` component, so a
person can retune it by eye against the real design tokens and export the
change back as text.

```sh
pnpm --filter @tuja/component-playground playground <config.playground.tsx>
```

It writes `<dir>/<name>.html` next to the config: a fragment with the app's
own token CSS and fonts inlined, no external requests.

The `component-playground` skill
(`.claude/skills/component-playground/SKILL.md`) drives this package: it
writes the config, runs the build above, publishes the result, and applies
what comes back to the component's source.

See `docs/design.md` for the full design, and `CONTEXT.md` for the words
this context uses — playground, stand-in, layer, cell, condition, and the
rest.
