# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website (shiqingqi.com) built with Next.js 15, featuring a resume section and integrated movie database application powered by TMDB API.

## Development Commands

### Essential Commands
```bash
# Development
pnpm dev                 # Start dev server with auto code generation
pnpm build              # Production build
pnpm build:tsc          # TypeScript type checking only

# Code Quality
pnpm lint               # Run Next.js linting
pnpm lint:changed       # Lint only changed files
pnpm prettier           # Format entire codebase
pnpm prettier:changed   # Format only changed files

# API Types
pnpm codegen            # Generate TypeScript types from TMDB OpenAPI spec
```

### Requirements
- Node.js 22.x
- PNPM >=9
- Uses PNPM workspace (do not use npm or yarn)

## Architecture

### Core Technologies
- **Next.js 15** with App Router and React 19
- **StyleX** for CSS-in-JS with compile-time optimization
- **TypeScript** with strict mode enabled
- **React Compiler** experimental feature enabled
- **TanStack Query** for data fetching
- **Serwist** for PWA/service worker functionality

### Project Structure
```
src/
├── app/[locale]/           # Internationalized routes (en/zh)
│   ├── (home)/            # Portfolio/resume sections
│   ├── movie-database/    # Movie database application
│   └── api/tmdb/          # TMDB API routes
├── components/            # Domain-organized components
├── hooks/                 # Custom React hooks
├── utils/                 # Utilities and API wrappers
├── _generated/            # Auto-generated TMDB types
└── tokens.stylex.ts       # Design system tokens
```

### Key Patterns

**Internationalization:**
- Routes prefixed with `[locale]` parameter
- Translation files colocated with components as `translations.json`
- Use `getLocalePath()` for generating localized URLs
- `useTranslations()` hook for component translations

**Styling with StyleX:**
- Import from `@stylexjs/stylex`
- Design tokens in `src/tokens.stylex.ts`
- Theme variables use CSS custom properties
- Responsive breakpoints via custom Babel plugin

**Data Fetching Architecture:**
- **Server components:** Call `tmdb-api.ts` functions directly for optimal performance
- **Client components:** Use TanStack Query → API routes → Server functions (never direct)
- **API functions:** Wrapped in `src/utils/tmdb-api.ts` with React `cache()`
- **Types:** Auto-generated in `src/_generated/tmdbV3.d.ts` from TMDB OpenAPI spec

**⚠️ CRITICAL: Never Call Server Functions Directly from React Query**

Server functions marked with `"use server"` cause Router setState errors when called during render. API routes are **required proxies**, not optional indirection.

```typescript
// ✅ CORRECT: Client → API Route → Server Function
queryFn: ({ pageParam }) => 
  apiRequestWrapper("/api/tmdb/movie-list", { ...params, page: pageParam })

// ❌ BREAKS: Client → Server Function (causes "Cannot update Router while rendering")
queryFn: ({ pageParam }) => 
  fetchMovieList({ ...params, page: pageParam })
```

**Component Organization:**
```typescript
// Server component pattern
export default async function Page(props: PageProps) {
  const params = await props.params;
  const { locale } = params;
  // Direct data fetching
}

// Client component with translations
"use client";
import { useTranslations } from "@/hooks/use-translations";
export function Component() {
  const { t } = useTranslations("namespace");
  // Component logic
}
```

### Environment Configuration

The project requires TMDB API access. No environment variables are committed - the API routes handle authentication server-side.

### Performance Considerations

- React Compiler enabled for automatic optimizations
- Service worker disabled in development
- Images optimized with Sharp
- View transitions API integrated
- List virtualization with React Virtuoso

### Code Quality Rules

- ESLint with Next.js, TypeScript, StyleX, and React Compiler rules
- Consistent type imports/exports enforced
- No unused promises or floating promises
- Import ordering enforced
- Prettier formatting on all code files