# Site

qingqi.dev — Qingqi Shi's bilingual (EN/ZH) personal site: a portfolio of work and education alongside a set of interactive projects, all served through a compile-time translation pipeline. The Movie Database and the Design System showcase live here but have their own glossaries — see `CONTEXT-MAP.md`.

## Language

**Creature**:
The pixel character a visitor assembles. The only noun for it — a saved one is a saved Creature.
_Avoid_: monster, pet, character, creation

**Language**:
Which language a page renders in — `en` or `zh`. ZH: 语言.
_Avoid_: locale, lang (in our own code; the HTML `lang` attribute and TMDB's `language` param are imposed)

**Translation key**:
A translation's identity — the first eight hex characters of a hash over both languages. Two different pairs producing one key is a build-stopping collision.
_Avoid_: key (bare), hash (as the noun for the key), id, token
