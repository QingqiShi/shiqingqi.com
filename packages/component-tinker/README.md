# @tuja/component-tinker

Builds a single-file HTML tinker for one `@tuja/ui` component, so a
person can retune it by eye against the real design tokens and export the
change back as text.

```sh
pnpm --filter @tuja/component-tinker tinker <config.tinker.tsx>
```

It writes `<dir>/<name>.html` next to the config: a fragment with the app's
own token CSS and fonts inlined, no external requests.

The `component-tinker` skill
(`.claude/skills/component-tinker/SKILL.md`) drives this package: it
writes the config, runs the build above, publishes the result, and applies
what comes back to the component's source.

See `docs/design.md` for the full design, and `CONTEXT.md` for the words
this context uses — tinker, stand-in, layer, cell, condition, and the
rest.
