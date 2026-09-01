# Movie Database

An AI-assisted browser for movies and TV shows, grounded in the TMDB API and a locale-namespaced vector index. A visitor either browses with filters or talks to the AI about what to watch next; there are no accounts.

Much of this context's vocabulary is imposed by TMDB's API and cannot be renamed. Where TMDB's word and ours differ, the entry says which is which.

## Language

### Content

**Media**:
The union of Movie and TV show — the entity this app browses. Internal only: users read "movie" or "TV show", never "media".
_Avoid_: content, item (as a suffix — `MediaListItem`), title (as the entity; a title is a name)

**Movie**:
A single feature film. ZH: 电影.
_Avoid_: film, 片子

**TV show**:
A single episodic series. ZH: 电视剧.
_Avoid_: series, show (bare), tvSeries, 剧集, 电视

**Details**:
The full record for one Media or Person, as opposed to the trimmed shape a list row carries. Always plural.
_Avoid_: Detail

**Rating**:
The audience score shown to a viewer, normalised from TMDB's `vote_average`.
_Avoid_: voteAverage (in our own normalised types; TMDB's `vote_average` is imposed)

**Similar**:
More media like this one. TMDB serves this from its `recommendations` endpoint — that name is imposed on the fetch layer and stops there.
_Avoid_: recommendation, recommended (for this sense)

**Trending**:
What is popular right now, from TMDB's trending endpoint. Nothing here is hand-picked.
_Avoid_: curated, recommended, 精选

**Genre**:
TMDB's category for a Media. ZH: 类型.

**Person**:
Someone credited on a Media. A **Credit** is the link between a Person and a Media; **cast** and **crew** are its two kinds. All four are TMDB's, and correctly layered — leave them.
_Avoid_: actor. Also avoid `Credit` for TMDB's legal attribution notice, which is an **Attribution**.

### Browsing

**Browse**:
The non-conversational half of the app — hero, trending rows, filters, results grid. The counterpart to Chat.

**Discover**:
TMDB's filtered-query mechanism, and the name of the endpoints that serve Browse. Imposed; not a user-facing word.

**Filter**:
A constraint a viewer sets to narrow results — media type, genres, sort.
_Avoid_: criteria, refine, facet

**Match mode**:
Whether a multi-genre filter requires all selected genres or any of them.
_Avoid_: genreFilterType

### The AI

**Chat**:
The conversational feature — the module, the input, the affordance a viewer opens.

**Conversation**:
One thread of messages between a visitor and the AI, restorable across visits. Storage keys and API fields say `session`; those are frozen, the word is not.
_Avoid_: chat (as the noun for a thread), thread

**Message**:
One entry in a Conversation. A **turn** is one user message plus the assistant's whole multi-step response — a coarser unit, used only when evaluating.
_Avoid_: exchange, reply

**Tool**:
A capability the model can call. A **present tool** (`present_*`) renders UI and returns its own input rather than fetching anything.
_Avoid_: function, action, skill (for this sense)

**Mood**:
The emotional register the AI classifies for each reply — warm, cool, tense, epic, playful, neutral. It colours the page background and is read from the content being discussed, not from how the visitor phrased things.
_Avoid_: vibe, tone

**Spiciness**:
A 1–5 dial on how opinionated a generated review summary is. 1 is neutral and factual, 5 is bold; 3 is the default. Nothing to do with the film's content.

**Taste**:
A viewer's remembered likes and dislikes — genres, actors, directors — that the AI carries between visits. Stored in the browser, never on a server.
_Avoid_: preference (that word means a site setting — see the Site context)

### Retrieval

**Semantic search**:
Meaning-based lookup against the vector index, as opposed to TMDB's keyword search.
_Avoid_: lookup, similarity search, `searchSimilar`

**Vector record**:
One indexed Media — one title, one record, no chunking. It is a `VectorRecord` written and a search result read; both name the same thing.
_Avoid_: chunk, document, passage

**Embedding text**:
The composed prose fed to the index's built-in embedder. Note the inversion from the usual convention: here **embedding** is the input text and **vector** is the stored record.

**Ingest**:
The job that populates the index. It runs **full** or **incremental**; incremental splits into a **changed** pass and a **trending** pass. **Upsert** is the write primitive, not the job.
_Avoid_: sync, load, import

## Deliberate divergences

- **Case is a boundary marker, not drift.** Tool inputs and TMDB-derived outputs are `snake_case`; vector-DB payloads and our normalised types are `camelCase`. The `map-tool-output/` modules exist to bridge them.
- The AI is never named or personified in the UI. It is "AI" in copy and "assistant" only as the message-role enum value.
- **QMDB** is retired. The product is "Movie Database" / 影视数据库 everywhere, including the home-page card.

## Frozen contracts

- URL: `/[locale]/movie-database`, `/[locale]/movie-database/[type]/[id]` where `type` is `movie` | `tv`
- Search params: `type`, `genre` (repeatable), `genreFilterType`, `sort`; sort values are TMDB's `popularity.desc` grammar
- Tool names as the model emits them: `classify_mood`, `semantic_search`, `tmdb_search`, `present_media`, `watch_providers`, `present_watch_providers`, `present_provider_regions`, `media_credits`, `person_credits`, `present_person`, `review_summary`, `save_preference`, `web_search`
- Redis `chat-session:{id}`, localStorage `ai-chat-session:{locale}`, IndexedDB `ai-chat-preferences`
- Vector record ids `{mediaType}-{tmdbId}`, namespace = locale, and every metadata field name (filters are built as raw strings)
- `POST /api/ai-chat` body shape, the `session-not-found` error literal, and the `/api/tmdb/*` route paths
- All TMDB request and response field names: `movie_id`, `series_id`, `person_id`, `vote_*`, `*_path`, `with_genres`, `sort_by`, `time_window`, `known_for_department`
- PostHog event names `conversation started` and `message sent`, with the properties `locale`, `started_conversation`, `conversation_message_count` — renaming one breaks the dashboards built on it. `apps/web/src/utils/posthog/types.ts` holds the catalog that declares them all.
