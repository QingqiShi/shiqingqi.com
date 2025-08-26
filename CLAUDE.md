# CLAUDE.md

Personal portfolio website built with Next.js 15, featuring a movie database powered by TMDB API.

## Essential Commands

```bash
pnpm dev                 # Start dev server
pnpm build:tsc          # TypeScript type checking
pnpm lint:changed       # Lint changed files
pnpm prettier:changed   # Format changed files
pnpm codegen            # Generate TMDB API types
```

## Task Completion Requirements

**CRITICAL: Before considering ANY task complete, ALWAYS run:**

```bash
pnpm prettier:changed
pnpm lint:changed
pnpm build:tsc
pnpm test
```

These checks are mandatory and must never be skipped.

## Key Architecture Patterns

**Data Fetching:**

- **Server components:** Call `tmdb-api.ts` functions directly
- **Client components:** Use TanStack Query → API routes → Server functions (never direct)

**⚠️ CRITICAL: Never Call Server Functions Directly from React Query**

Server functions cause Router setState errors. API routes are required proxies:

```typescript
// ✅ CORRECT: Client → API Route → Server Function
queryFn: ({ pageParam }) =>
  apiRequestWrapper("/api/tmdb/movie-list", { ...params, page: pageParam });

// ❌ BREAKS: Client → Server Function
queryFn: ({ pageParam }) => fetchMovieList({ ...params, page: pageParam });
```

**Internationalization:**

- Routes use `[locale]` parameter (en/zh)
- Use `getLocalePath()` for localized URLs
- `useTranslations()` hook with colocated `translations.json` files

**Styling:**

- StyleX CSS-in-JS with design tokens in `src/tokens.stylex.ts`

## Testing & Verification

**Puppeteer Testing:**

- Only test with Puppeteer AFTER successfully implementing requested changes
- **IMPORTANT: If you cannot achieve the requested implementation and end up reverting everything, there's no point in Puppeteer verification**
- Puppeteer should verify the final working implementation, not failed attempts

## Requirements

- Node.js 22.x, PNPM >=9 (no npm/yarn)
- After significant changes: test with Puppeteer navigation flows
