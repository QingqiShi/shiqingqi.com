# Essential Commands

```bash
pnpm dev                # Start dev server
pnpm build              # Full Next.js build (including type checking and linting)
pnpm build:tsc          # TypeScript type checking
pnpm lint               # Lint all files
pnpm lint:changed       # Lint changed files
pnpm format:write       # Format all files
pnpm format:changed     # Format changed files
pnpm test               # Run tests
pnpm codegen            # Generate TMDB API types and server functions
pnpm codegen:tmdb       # Generate only TMDB server functions
```

# Key Architecture Patterns

<pattern>
<topic>Data Fetching</topic>
<notes>
- Use `fetch` API inside server functions
- Server components call server functions directly
- Client components use TanStack Query to `fetch` from API routes which are wrappers around server functions
- Mutations from client components call server functions directly
- TMDB API calls using auto-generated server functions from `tmdb-server-functions.ts`
</notes>
<example>

```tsx
import { discoverMovies } from "@/utils/tmdb-server-functions";
function serverFunction() {
  return fetch(URL, headers);
}
function ServerComponent() {
  const movies = await discoverMovies({
    page: 1,
    with_genres: "28",
  });
  const myResults = await serverFunction();
  return <div>...</div>;
}
```

</example>
<example>

<!-- API Route -->

```ts
// src/app/api/tmdb/discover-movies/route.ts
import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { discoverMovies } from "@/utils/tmdb-server-functions";

export const GET = apiRouteWrapper(discoverMovies);

// src/app/api/some-api-route.ts
import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { myServerFunction } from "@/some-server-function";

export const GET = apiRouteWrapper(async (params) => {
  return myServerFunction(params);
});
```

<!-- Client Component -->

```tsx
"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { apiRequestWrapper } from "@/utils/api-request-wrapper";

function ClientComponent() {
  const { data: movies } = useSuspenseQuery({
    queryKey: [{ scope: "movies", page: 1, with_genres: "28" }],
    queryFn: () =>
      apiRequestWrapper("/api/tmdb/movie-list", {
        page: 1,
        with_genres: "28",
      }),
  });

  const { data: movies } = useSuspenseQuery({
    queryKey: [{ scope: "someApiRoute" }],
    queryFn: () =>
      apiRequestWrapper("/api/some-api-route", {
        foo: "bar",
      }),
  });

  return <div>...</div>;
}
```

</example>
</pattern>

<pattern>
<topic>Internationalization</topic>
<notes>
- Routes use `[locale]` parameter (en/zh)
- Use `getLocalePath()` for localized URLs
- Translations for server components are defined in `translations.json` under the `components` and routes folders
- Translations for client components are defined in `[name].translations.json` broken down by component to allow tree shaking
- Server components use the `getTranslations` util to obtain translated texts
- Client components use the `useTranslations()` hook which reads translations from context
- To pass translations to clients a server component parent must render `<TranslationContextProvider />` with the right translation content
</notes>
</pattern>

<pattern>
<topic>Styling</topic>
<notes>
- Use StyleX
- Design tokens in `src/tokens.stylex.ts`
- Custom babel plugins to enable
  - css prop `css={styles.someStyle}` transpiles to `{...stylex.props}`
  - `@breakpoints` is defined through the babel plugin defined in `.babelrc.js` and the typing declared in `src/babel.d.ts`
</notes>
<example>

```tsx
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { color, controlSize, font } from "@/tokens.stylex";

function Button({ children, isActive, hideLabelOnMobile, ...props }) {
  return (
    <button
      {...props}
      css={[
        styles.button,
        isActive && styles.active,
        hideLabelOnMobile && styles.hideLabelOnMobile,
      ]}
    >
      {children}
    </button>
  );
}

const styles = stylex.create({
  button: {
    // Use design tokens
    fontSize: controlSize._4,
    fontWeight: font.weight_5,
    minHeight: controlSize._9,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,

    // Responsive design with breakpoints
    display: { default: "none", [breakpoints.md]: "inline-flex" },

    // Theme-aware colors
    color: color.textMain,
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
    },
  },
  active: {
    backgroundColor: color.controlActive,
    color: color.textOnActive,
  },
  hideLabelOnMobile: {
    paddingLeft: {
      default: controlSize._3,
      [breakpoints.md]: controlSize._2,
    },
  },
});
```

</example>
</pattern>

<pattern>
<topic>Cutting-edge React</topic>
<notes>
- React 19
- Use shorthand syntax: `<Context value={...}>` instead of `<Context.Provider value={...}>`
- Use `use()` hook instead of `useContext()` for consuming context
- React Compiler enabled, so
  - No need for `useMemo`, `useCallback`, or `memo()` - React Compiler handles optimization automatically
  - Use `@inferEffectDependencies` comment at top of client component files to enable automatic useEffect dependency inference
  - Can omit useEffect dependency arrays when using `@inferEffectDependencies` - React Compiler infers them
  - Avoid manual memoization patterns
</notes>
</pattern>

<pattern>
<topic>Testing</topic>
<notes>
- Uses Vitest for client components and synchronous server components
- Unique setup integrating with babel and using `enforce: pre` to handle StyleX transformations
</notes>
</pattern>

<pattern>
<topic>TMDB Code Generation</topic>
<notes>
- Uses selective Zod schema generation for optimal performance (98.7% size reduction)
- Only generates Zod schemas for endpoints marked with `needsZodSchema: true` in `endpoints-config.js`
- AI tools require Zod schemas for OpenAI Structured Outputs validation
- Custom generator at `tooling/tmdb-codegen/generate-selective-zod.js` creates hand-crafted schemas
- Automatically applies OpenAI compatibility fixes (`.nullable().optional()`)
- Generated file goes from 16K lines to ~200 lines, dramatically improving dev experience
</notes>
<example>

```js
// tooling/tmdb-codegen/endpoints-config.js
export const endpoints = [
  {
    path: "/3/search/movie",
    functionName: "searchMovies",
    needsZodSchema: true, // Required for AI tools - triggers Zod generation
  },
  {
    path: "/3/movie/{movie_id}",
    functionName: "getMovieDetails",
    // No needsZodSchema flag = no Zod schema generated
  },
];
```

```bash
# Regenerate optimized schemas
pnpm codegen:zod     # Only generates needed schemas (super fast!)
pnpm codegen         # Full pipeline including TypeScript types
```

</example>
</pattern>

# CRITICAL INSTRUCTIONS

ALWAYS follow these rules

- Run `pnpm lint:changed` `pnpm test` and `pnpm build:tsc` before any task is considered complete.
- NEVER EVER use `any` type explicitly or implicitly
- AVOID type assertions (`as Type`)
- Prefer letting TypeScript infer types over explicit type annotations
- AVOID mocking in tests. Only exception is network mocks using MSW.
- TMDB server functions in `src/_generated/tmdb-server-functions.ts` are auto-generated - DO NOT edit manually. Use `pnpm codegen:tmdb` to regenerate.
- Auto-generated TMDB files are git-ignored and must be regenerated after cloning: `pnpm codegen:tmdb`

# IN PROGRESS

We are currently implementing a project to integrate AI into the movie-database functionality.
Product requirements exist in: PRD.md
Useful guides about OpenAI API integration in: OPENAI.md
Current development plan and progress in DEV_PLAN.md

IMPORTANT: NEVER EVER COMPACT INFORMATION ABOVE THIS LINE.
