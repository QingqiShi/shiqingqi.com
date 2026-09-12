# Movie Database

An AI-assisted browser for movies and TV shows, grounded in the TMDB API and a locale-namespaced vector index; a visitor either browses with filters or talks to the AI about what to watch next, and there are no accounts. Much of the vocabulary is imposed by TMDB and cannot be renamed — where TMDB's word and ours differ, the entry says which is which.

## Language

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

**Browse**:
The non-conversational half of the app — hero, trending rows, filters, results grid. The counterpart to Chat.

**Discover**:
TMDB's filtered-query mechanism, and the name of the endpoints that serve Browse. Imposed; not a user-facing word.

**Chat**:
The conversational feature — the module, the input, the affordance a viewer opens. The AI behind it is never named or personified: it is "AI" in copy, and "assistant" only as the message-role value.

**Mood**:
The emotional register the AI classifies for each reply — warm, cool, tense, epic, playful, neutral. It colours the page background and is read from the content being discussed, not from how the visitor phrased things.
_Avoid_: vibe, tone

**Spiciness**:
A 1–5 dial on how opinionated a generated review summary is. 1 is neutral and factual, 5 is bold; 3 is the default. Nothing to do with the film's content.

**Taste**:
A viewer's remembered likes and dislikes — genres, actors, directors — that the AI carries between visits. Stored in the browser, never on a server.
_Avoid_: preference (that word means a site setting)

**Semantic search**:
Meaning-based lookup against the vector index, as opposed to TMDB's keyword search.
_Avoid_: lookup, similarity search, `searchSimilar`

**Ingest**:
The job that populates the index. It runs **full** or **incremental**; incremental splits into a **changed** pass and a **trending** pass. **Upsert** is the write primitive, not the job.
_Avoid_: sync, load, import
