# CRITICAL DEBUGGING LESSONS

## Environment Variables and Configuration

**ALWAYS verify configuration names by reading the actual source code FIRST before setting up external configuration (GitHub secrets, env files, etc).**

### Example: CI Failing with 401 Unauthorized

❌ **Wrong approach**: Assume environment variable names, add them to GitHub secrets, debug why they're not passed correctly
✅ **Right approach**: `grep -r "process.env.TMDB" src/` → Find actual variable name in code → Use that exact name

**Key principle**: Never assume configuration names. Always check what the code expects before configuring external systems.

# Essential Commands

```bash
pnpm dev                # Start dev server
pnpm build              # Full Next.js build (including type checking and linting)
pnpm build:tsc          # TypeScript type checking
pnpm lint               # Lint all files
pnpm lint:changed       # Lint changed files
pnpm format:write       # Format all files
pnpm format:changed     # Format changed files
pnpm test               # Run unit tests (Vitest)
pnpm test:e2e           # Run E2E tests (Playwright) - auto-starts dev server
pnpm codegen            # Generate TMDB API types and server functions
pnpm codegen:tmdb       # Generate only TMDB server functions
```

# Package Management

This project uses corepack to manage pnpm versions:

- pnpm version is specified in package.json's `packageManager` field
- corepack automatically uses the exact version specified
- To upgrade pnpm: run `corepack use pnpm@latest` (automatically updates package.json)
- If getting signature verification errors, update corepack first: `npm install -g corepack@latest`

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
- Uses Vitest for unit testing client components and synchronous server components
- Uses Playwright for E2E testing with automatic dev server startup
- E2E tests located in `e2e/` directory
- Playwright config includes HTML reporter and trace collection on retry
- Full E2E tests are expected to take around 15 minutes
- Unique Vitest setup integrating with babel and using `enforce: pre` to handle StyleX transformations

**E2E Testing Best Practices:**

- **Test like a user, not a developer** - Wait for visible UI changes (text, elements appearing/disappearing) rather than technical state (URLs, cookies, localStorage, networkidle)
- **Use semantic locators** - Prefer `page.getByRole('button', { name: 'Submit' })` over CSS selectors or `locator('[aria-label="..."]')`
- **Avoid testing implementation details** - Don't assert on cookies, localStorage, internal state, or URL paths - test what users see
- **Avoid arbitrary waits** - Replace `waitForTimeout()` with `waitFor(() => expect(element).toBeVisible())` or waiting for text changes
- **Simplify test setup** - Minimize beforeEach steps, avoid redundant navigations (navigate once, don't clear then reload)
  </notes>
  <example>

```typescript
// ❌ Bad: Testing implementation details with technical waits
test("language switch", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle"); // Technical state
  await page.context().clearCookies();
  await page.reload();
  await page.waitForLoadState("networkidle");

  const button = page.locator('button[aria-label="Select a language"]'); // CSS selector
  await button.click();
  await page.waitForTimeout(200); // Arbitrary wait

  const option = page.locator('a[aria-label="切换至中文"]');
  await option.click();
  await page.waitForFunction(() => window.location.pathname.includes("/zh")); // URL check

  const cookies = await page.context().cookies(); // Implementation detail
  expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("zh");
});

// ✅ Good: Testing user-visible behavior
test("language switch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();

  await page.getByRole("button", { name: "Select a language" }).click();
  await page.getByRole("link", { name: "切换至中文" }).click();

  // Wait for actual content to change
  await expect(page.getByRole("heading", { name: "欢迎" })).toBeVisible();
});
```

</example>
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

- Run `pnpm lint:changed` `pnpm test` `pnpm test:e2e` and `pnpm build:tsc` before any task is considered complete.
- NEVER EVER use `any` type explicitly or implicitly
- AVOID type assertions (`as Type`)
- Prefer letting TypeScript infer types over explicit type annotations
- AVOID mocking in tests. Only exception is network mocks using MSW.
- TMDB server functions in `src/_generated/tmdb-server-functions.ts` are auto-generated - DO NOT edit manually. Use `pnpm codegen:tmdb` to regenerate.
- Auto-generated TMDB files are git-ignored and must be regenerated after cloning: `pnpm codegen:tmdb`

IMPORTANT: NEVER EVER COMPACT INFORMATION ABOVE THIS LINE.
