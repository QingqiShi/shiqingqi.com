# Site

qingqi.dev — Qingqi Shi's bilingual (EN/ZH) personal site. A portfolio of work and education alongside a set of interactive Projects, all served through a compile-time translation pipeline.

The Movie Database and the Design System showcase live here but have their own glossaries — see `CONTEXT-MAP.md`.

## Language

### The site

**Project**:
Anything listed in the home page's Projects section — the interactive apps built here, the Design System showcase, and outbound links to work hosted elsewhere. The site's own umbrella noun. ZH: 项目.
_Avoid_: playground app, tool page, demo, experiment, showcase (as the umbrella)

**Playground**:
The unlinked WebGL shader route, and nothing else. Deliberately kept out of search engines and social previews, so it is never named in copy that ships.

**Preference**:
A choice a visitor makes about how the site behaves — theme, locale. Stored in the browser.

**Theme**:
Light, dark, or system. ZH: 主题.
_Avoid_: mode, colour scheme, appearance, dark mode, 模式

**Shell**:
The page frame a route sits in. Every route gets exactly one.

### Portfolio

**Experience**:
A role held at an organisation, with its own detail page. EN heading "Experience"; ZH: 工作经历.
_Avoid_: job, position, work history, 工作 (bare), 职业经历

**Education**:
A qualification earned at an institution, with its own detail page. ZH: 教育经历.
_Avoid_: study, 学习

**Hero**:
The opening block of a page — headline, standfirst, primary action.
_Avoid_: intro, about, bio

### Pixel Creature Creator

**Creature**:
The pixel character a visitor assembles. The only noun for it — a saved one is a saved Creature.
_Avoid_: monster, pet, character, creation

**Species**:
The Creature's body plan — one of sixteen, from `feline` to `worm-like`. The base every other axis layers onto.

**Element**:
The Creature's elemental category — leaf, ember, tide, dust, glow, frost, dawn, or void. Drives its tint and its lore.
_Avoid_: type, elemental type, 种类

**Emotion**:
The Creature's expression — idle, joy, sad, excited, sleepy, grumpy, curious. A visitor picks a default and can toggle it afterwards.
_Avoid_: vibe, mood

**Accessory**:
An item layered on top of a Species. A Creature carries at most two.
_Avoid_: feature, part, 特征

**Stat**:
One of the four numbers a Creature is seeded with — vigour, spark, ward, hustle.
_Avoid_: trait, attribute, gene

**Lore**:
The short bilingual backstory an LLM writes for a named Creature. Shown to users as "Conjure lore" — deliberate flavour, kept.
_Avoid_: backstory, story, description

**Create**:
The verb for assembling a Creature. The route, the flow, and the product name all use it.
_Avoid_: build, design, make (for this sense)

**Wizard**:
The four-step create flow: Species, Accessories, Emotion, Name.
_Avoid_: flow, stepper

### Sprite Editor

**Sprite**:
A pixel-art image made of discrete, addressable pixels — what the Sprite Editor slices and exports, and what renders a Creature.

**Cell**:
One region sliced out of a source image by the grid overlay. The Sprite Editor's unit of work.
_Avoid_: tile, dot

**Pixel map**:
A Sprite's pixel data expressed as rows of palette-index characters.
_Avoid_: tile

**Frame**:
One entry in an animation timeline, pointing at a Cell by index. Distinct from a Cell: reordering frames never moves cells.

**Palette**:
An ordered colour list that a Pixel map's characters index into.

**Editor mode**:
Which of the three top-level views is active — slice, edit, or animation.
_Avoid_: mode (bare)

**Selection mode**:
Whether a selection is a marquee or a floating, moveable region.
_Avoid_: mode (bare)

**Tool**:
The active drawing instrument — pencil, eraser, select, eyedropper, fill.
_Avoid_: brush

### Translations

**Locale**:
Which language a page renders in — `en` or `zh`. The word in code and in URLs. Shown to users as "Language" / 语言, deliberately.
_Avoid_: language, lang (in our own code; the HTML `lang` attribute and TMDB's `language` param are imposed)

**Translation**:
One English/Chinese pair, written inline at the call site as `t({ en, zh })`. There are no hand-edited catalogue files.
_Avoid_: message, copy, phrase, string (as the noun)

**Key**:
A Translation's identity — the first eight hex characters of a hash over both languages. Two different pairs producing one key is a build-stopping collision.
_Avoid_: hash (as the noun for the key), id, token

**Bundle**:
A locale's key-to-string map. The **global bundle** carries every Translation; a **client bundle** carries only what one page's client subtree can reach.
_Avoid_: catalog, dictionary, map

**Manifest**:
The page-path-to-bundle-name index the Babel plugin reads to decide which files get wrapped. Not a Bundle.

**Render scope**:
The only place `t()` may be called — a component body, a custom hook, or `generateMetadata`. Enforced by `@tuja/no-t-outside-render`, because the client transform yields a hook.

**Codegen**:
The task that extracts Translations and writes Bundles. `generate` names the functions and the output directory; `build` is the npm lifecycle around it.
_Avoid_: scan, harvest, extract (for the whole task — extraction is one step of it)

## Frozen contracts

- Route segments: `/[locale]/experiences/*`, `/[locale]/education/*`, `/pixel-creature-creator`, `/pixel-creature-creator/create`, `/pixel-creature-creator/c`, `/sprite-editor`, `/calculator`, `/playground`, `/playground/pixel-gallery`
- Serialised Creature state in the `/pixel-creature-creator/c` URL hash — renaming a field breaks shared links unless the reader accepts both keys
- localStorage `pcc:saved:v1`, `theme`; cookie `NEXT_LOCALE`
- Generated i18n paths `src/_generated/i18n/{translations.{en,zh}.json,client/,client-loaders/,manifest.json}`, the `getClientTranslations` export name, the kebab-case bundle-name derivation, and the 8-char key format (implemented twice and parity-tested)
- Compile targets `__i18n_lookup`, `__i18n_lookupParse`, `useI18nLookup`, `useI18nLookupParse`, and the `#src/i18n` import specifier that marks a `t` import
- `t()` accepts an object literal with `en` and `zh` **string literals** only, plus an optional `{ parse: true }`
