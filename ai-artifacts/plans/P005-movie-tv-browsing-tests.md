# Implementation Plan: Movie and TV Show Browsing with Filtering E2E Tests

**Spec Reference:** `ai-artifacts/specs/005-movie-tv-browsing.md`
**Plan Created:** 2025-09-30
**Planning Scope:** Write basic Playwright E2E tests for movie/TV browsing with filtering features

## Executive Summary

Create E2E tests for the movie database browse page covering media type toggling, genre filtering, sorting, infinite scroll, filter reset, URL persistence, and card navigation. Tests will be basic but comprehensive, focusing on user-visible behavior rather than implementation details. Complex filter combinations and mobile-specific tests will be kept simple or marked as optional.

## Architecture Research

### Existing Patterns

- **Test Structure**: Tests in `e2e/` directory with `*.spec.ts` files
- **User-Centric Testing**: Focus on visible UI changes, semantic locators, actual content verification
- **Semantic Locators**: Use `getByRole()`, `getByText()` for buttons, links, and interactive elements
- **Wait Strategy**: Wait for actual content using `toBeVisible()`, never arbitrary timeouts
- **URL Testing**: Check URL parameters for filter persistence, but verify visible UI changes as primary

### Key Files and Components

- `src/app/[locale]/movie-database/(list)/page.tsx`: Browse page server component with filters and infinite scroll
- `src/components/movie-database/filters.tsx`: Filter container with media type toggle, genre filter button, sort filter, reset filter
- `src/components/movie-database/media-type-toggle.tsx`: Movies/TV Shows toggle buttons
- `src/components/movie-database/genre-filter.tsx`: Genre selection buttons with AND/OR toggle
- `src/components/movie-database/sort-filter.tsx`: Sort dropdown (popularity, rating, release date, title)
- `src/components/movie-database/media-list.tsx`: Grid of poster cards with infinite scroll
- `src/components/movie-database/reset-filter.tsx`: Reset filters button

### Data Flow Analysis

Browse page with client-side filtering and infinite scroll:

1. User navigates to `/[locale]/movie-database`
2. Server renders initial page with default filters (movies, popularity sort, all genres)
3. URL parameters control filters: `?type=tv&genre=28&genre=12&genreFilterType=any&sort=vote_average.desc`
4. Client components (MediaFiltersProvider, MediaList) fetch data via TanStack Query
5. Filters update URL via `useRouter().push()` and trigger new data fetches
6. Infinite scroll automatically loads next page when user scrolls to 80% of page height
7. Poster cards navigate to `/movie-database/[type]/[id]` detail pages

### Integration Points

- **TMDB API**: Fetches movie/TV data via `discoverMovies()` and `discoverTvShows()` server functions
- **TanStack Query**: Client-side data fetching with caching and infinite queries
- **Next.js Routing**: URL search parameters for shareable filter states
- **i18n System**: Genre names and UI labels are localized

## Implementation Phases

### Phase 1: Initial Page Load and Default State

**Goal:** Verify browse page loads with default state (movies, popularity sort, no genre filters)
**Deliverable:** Test file `e2e/movie-tv-browsing.spec.ts` with basic page load tests

#### Tasks

- [ ] Create test file `e2e/movie-tv-browsing.spec.ts` with describe block "Movie and TV Show Browsing"
- [ ] Add `beforeEach` hook that navigates to `/en/movie-database` and waits for content
- [ ] Write test: "should display movie grid by default with popularity sort"
  - Navigate to `/en/movie-database`
  - Verify "Movies" toggle button is active (has isActive state or distinct styling)
  - Verify poster cards are visible (at least 10-20 cards)
  - Verify sort dropdown shows "Popularity" or default sort option
- [ ] Write test: "should display filter controls"
  - Verify media type toggle (Movies/TV Shows buttons) is visible
  - Verify genre filter button is visible
  - Verify sort dropdown is visible
  - Verify TMDB credit/attribution is visible

#### Acceptance Criteria

- [ ] Test file created with describe block
- [ ] Tests verify visible filter controls and poster cards
- [ ] Tests use semantic locators for buttons and UI elements
- [ ] No arbitrary waits - wait for actual content visibility

#### Validation Strategy

- **Manual Verification**: Manually visit `/en/movie-database` and verify default state
- **Code Review**: Ensure tests wait for visible content, not just page load

---

### Phase 2: Media Type Toggle Tests

**Goal:** Verify switching between Movies and TV Shows updates the grid
**Deliverable:** Tests for media type toggle functionality

#### Tasks

- [ ] Write test: "should switch from movies to TV shows when toggle is clicked"
  - Navigate to `/en/movie-database` (default movies)
  - Wait for movie poster cards to be visible
  - Click "TV Shows" button
  - Wait for TV show poster cards to be visible (content changes)
  - Verify "TV Shows" button is now active
  - Verify URL contains `?type=tv`
- [ ] Write test: "should switch back from TV shows to movies"
  - Navigate to `/en/movie-database?type=tv`
  - Wait for TV show cards to be visible
  - Click "Movies" button
  - Wait for movie cards to be visible (content changes)
  - Verify "Movies" button is active
  - Verify URL does not contain `type=tv` (or contains `type=movie`)

#### Acceptance Criteria

- [ ] Media type toggle tests pass for both directions (Movies ↔ TV Shows)
- [ ] Tests wait for actual content changes (poster cards update)
- [ ] URL parameter is verified as secondary check
- [ ] Tests verify active button state changes

#### Validation Strategy

- **Manual Verification**: Click toggle buttons and verify grid content changes
- **Code Review**: Ensure tests wait for content changes, not just URL updates

---

### Phase 3: Genre Filter Tests (Basic)

**Goal:** Verify genre filtering works with single and multiple genre selections
**Deliverable:** Basic tests for genre selection and filtering

#### Tasks

- [ ] Write test: "should filter movies by single genre selection"
  - Navigate to `/en/movie-database`
  - Click genre filter button to open genre list
  - Wait for genre buttons to be visible (e.g., "Action", "Comedy", "Drama")
  - Click "Action" genre button
  - Wait for content to update (cards reload)
  - Verify URL contains `genre=28` (or Action genre ID)
  - Verify "Action" genre button shows active state
- [ ] Write test: "should filter with multiple genres using AND logic (default)"
  - Navigate to `/en/movie-database`
  - Click genre filter button
  - Click "Action" genre button
  - Click "Adventure" genre button (add second genre)
  - Wait for content to update
  - Verify URL contains both genre IDs (e.g., `genre=28&genre=12`)
  - Verify both genre buttons show active state
- [ ] Write test: "should toggle genre filter type from ALL to ANY"
  - Navigate to `/en/movie-database` with genres selected
  - Click genre filter button
  - Click "ALL"/"ANY" toggle to switch to "ANY" mode
  - Wait for content to update
  - Verify URL contains `genreFilterType=any`

#### Acceptance Criteria

- [ ] Genre filter tests pass for single and multiple genre selection
- [ ] Tests verify active state for selected genres
- [ ] Tests verify URL parameters are updated
- [ ] Tests wait for visible content changes after filter application
- [ ] ALL/ANY toggle test verifies mode switch

#### Validation Strategy

- **Manual Verification**: Click genre buttons and verify filtering works
- **Code Review**: Ensure tests wait for content updates, not just filter button states

---

### Phase 4: Sort Filter Tests

**Goal:** Verify sort dropdown changes content order
**Deliverable:** Tests for sort functionality

#### Tasks

- [ ] Write test: "should sort movies by rating when rating option is selected"
  - Navigate to `/en/movie-database`
  - Click sort dropdown to open options
  - Select "Rating" option (or "Highest Rated")
  - Wait for content to update (cards may reload)
  - Verify URL contains `sort=vote_average.desc`
  - Verify sort dropdown shows "Rating" as selected
- [ ] Write test: "should sort by release date"
  - Navigate to `/en/movie-database`
  - Click sort dropdown
  - Select "Release Date" option
  - Wait for content to update
  - Verify URL contains `sort=release_date.desc` (or similar)
- [ ] Write test: "should sort by title A-Z"
  - Navigate to `/en/movie-database`
  - Click sort dropdown
  - Select "Title" option
  - Wait for content to update
  - Verify URL contains `sort=title.asc` (or similar)

#### Acceptance Criteria

- [ ] Sort tests pass for at least 2-3 sort options
- [ ] Tests verify URL parameter changes
- [ ] Tests verify dropdown shows selected option
- [ ] Tests wait for content updates after sort change

#### Validation Strategy

- **Manual Verification**: Change sort options and verify content reorders
- **Decision Point**: Verifying actual content order (e.g., ratings descending) is complex - URL check is sufficient

---

### Phase 5: Reset Filter Tests

**Goal:** Verify reset button clears all filters and returns to default state
**Deliverable:** Tests for filter reset functionality

#### Tasks

- [ ] Write test: "should show reset button when filters are applied"
  - Navigate to `/en/movie-database`
  - Apply genre filter (click Action genre)
  - Verify reset filter button is visible
  - Navigate to `/en/movie-database` (no filters)
  - Verify reset button is not visible (or hidden)
- [ ] Write test: "should reset all filters to default when reset button is clicked"
  - Navigate to `/en/movie-database`
  - Apply multiple filters:
    - Switch to TV Shows
    - Select Action genre
    - Change sort to Rating
  - Click reset filter button
  - Wait for content to update
  - Verify URL no longer contains genre, genreFilterType, or sort parameters
  - Verify media type remains (still TV Shows, per spec FR-026)
  - Verify genre buttons are no longer active
  - Verify sort dropdown shows default (Popularity)

#### Acceptance Criteria

- [ ] Reset button visibility test passes
- [ ] Reset functionality test clears all filters except media type
- [ ] Tests verify URL parameters are cleared
- [ ] Tests verify UI elements return to default state
- [ ] Media type is preserved after reset (per spec)

#### Validation Strategy

- **Manual Verification**: Apply filters, click reset, verify all cleared except media type
- **Code Review**: Ensure test checks both URL and visible UI changes

---

### Phase 6: Infinite Scroll Tests (Basic)

**Goal:** Verify infinite scroll loads more content when scrolling down
**Deliverable:** Basic test for infinite scroll pagination

#### Tasks

- [ ] Write test: "should load more movies when scrolling to bottom"
  - Navigate to `/en/movie-database`
  - Wait for initial poster cards to be visible (at least 20 cards)
  - Count initial number of cards visible
  - Scroll to bottom of page using `page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))`
  - Wait for additional cards to be visible (page count increases)
  - Verify more cards are now visible than initially
  - Optionally verify loading skeleton appears during fetch

#### Acceptance Criteria

- [ ] Infinite scroll test successfully loads more content
- [ ] Test verifies card count increases after scroll
- [ ] No arbitrary waits - wait for actual new content visibility
- [ ] Optional: Verify loading skeleton appears during pagination

#### Validation Strategy

- **Manual Verification**: Scroll to bottom and verify new cards load automatically
- **Decision Point**: Testing exact page count or scroll trigger point (80%) is complex - basic "more cards appear" check is sufficient

---

### Phase 7: URL Persistence and Shareability Tests

**Goal:** Verify filters persist across page reloads and direct URL access
**Deliverable:** Tests for URL-based filter persistence

#### Tasks

- [ ] Write test: "should persist filter state in URL for shareability"
  - Navigate to `/en/movie-database`
  - Switch to TV Shows
  - Select Action genre
  - Change sort to Rating
  - Verify URL contains `type=tv&genre=28&sort=vote_average.desc`
- [ ] Write test: "should load page with filters from URL parameters"
  - Navigate directly to `/en/movie-database?type=tv&genre=28&sort=vote_average.desc`
  - Wait for content to be visible
  - Verify "TV Shows" button is active
  - Verify "Action" genre button shows active state
  - Verify sort dropdown shows "Rating" selected
  - Verify poster cards are visible (filtered content loaded)
- [ ] Write test: "should maintain filters after page refresh"
  - Navigate to `/en/movie-database`
  - Apply filters (TV Shows, Action genre)
  - Reload page using `page.reload()`
  - Wait for content to be visible
  - Verify filters are still applied (TV Shows active, Action active)

#### Acceptance Criteria

- [ ] URL persistence tests pass for filter state
- [ ] Direct URL navigation test loads correct filter state
- [ ] Page refresh test maintains filters
- [ ] Tests verify both URL parameters and visible UI state

#### Validation Strategy

- **Manual Verification**: Apply filters, copy URL, open in new tab, verify same filters
- **Code Review**: Ensure tests verify visible UI state, not just URL

---

### Phase 8: Card Navigation Tests

**Goal:** Verify clicking poster cards navigates to detail pages
**Deliverable:** Tests for card click navigation

#### Tasks

- [ ] Write test: "should navigate to movie detail page when movie card is clicked"
  - Navigate to `/en/movie-database`
  - Wait for movie poster cards to be visible
  - Click first poster card (link with accessible name or role)
  - Wait for detail page to load (verify h1 with movie title is visible)
  - Verify URL matches pattern `/en/movie-database/movie/[id]`
- [ ] Write test: "should navigate to TV show detail page from TV shows grid"
  - Navigate to `/en/movie-database?type=tv`
  - Wait for TV show poster cards to be visible
  - Click first poster card
  - Wait for detail page to load (verify h1 with show title is visible)
  - Verify URL matches pattern `/en/movie-database/tv/[id]`

#### Acceptance Criteria

- [ ] Card navigation tests pass for both movies and TV shows
- [ ] Tests verify destination page content is visible (h1 with title)
- [ ] Tests verify URL pattern matches expected structure
- [ ] Tests wait for actual page content, not just URL change

#### Validation Strategy

- **Manual Verification**: Click poster cards and verify detail page loads
- **Code Review**: Ensure tests wait for detail page content, not just navigation

---

### Phase 9: Bilingual Support Tests

**Goal:** Verify browse page works correctly in both English and Chinese
**Deliverable:** Tests for translated content and localized filtering

#### Tasks

- [ ] Write test: "should display English UI labels and genre names"
  - Navigate to `/en/movie-database`
  - Verify filter controls have English labels ("Movies", "TV Shows", "Filters")
  - Click genre filter button
  - Verify genre names are in English (e.g., "Action", "Comedy")
- [ ] Write test: "should display Chinese UI labels and genre names"
  - Navigate to `/zh/movie-database`
  - Verify filter controls have Chinese labels
  - Click genre filter button
  - Verify genre names are in Chinese
- [ ] Write test: "should maintain language when navigating from cards"
  - Navigate to `/zh/movie-database`
  - Click poster card
  - Verify detail page URL contains `/zh/`
  - Verify detail page content is in Chinese

#### Acceptance Criteria

- [ ] English and Chinese UI tests pass
- [ ] Tests verify actual translated text is visible
- [ ] Genre names are correctly localized
- [ ] Navigation maintains language preference
- [ ] Tests use text matching, not just element existence

#### Validation Strategy

- **Manual Verification**: Switch languages and verify UI labels and genre names change
- **Code Review**: Ensure tests check actual translated content

---

### Phase 10: "No Results Found" State Tests

**Goal:** Verify empty state message displays when no content matches filters
**Deliverable:** Tests for empty state handling

#### Tasks

- [ ] Write test: "should display 'No results found' when filter combination returns no results"
  - Navigate to `/en/movie-database`
  - Apply extreme filter combination that likely returns no results:
    - Select multiple very specific genres
    - Set high rating sort
  - Wait for content to update
  - Verify "No results found" message is visible (check for text or empty state UI)
  - Verify no poster cards are visible

#### Acceptance Criteria

- [ ] Empty state test passes
- [ ] Test verifies empty state message is visible
- [ ] Test verifies poster cards are not visible
- [ ] Test waits for content update, not arbitrary timeout

#### Validation Strategy

- **Manual Verification**: Apply very specific filters until no results appear
- **Decision Point**: Finding a reliable filter combination that always returns zero results may be difficult - this test may be optional or marked as flaky

---

## Risk Assessment

### Potential Issues

- **Content Loading Speed**: TMDB API may be slow, causing tests to timeout
  - **Likelihood**: Medium
  - **Impact**: Medium (tests may be flaky)

- **Genre IDs and Names**: Genre IDs or names may change if TMDB updates their genre list
  - **Likelihood**: Low
  - **Impact**: Low (tests can use flexible genre matching)

- **Infinite Scroll Timing**: Infinite scroll may trigger at different scroll positions
  - **Likelihood**: Medium
  - **Impact**: Low (test checks for "more cards", not exact trigger point)

- **Empty State Filters**: Finding a reliable filter combination that always returns zero results is difficult
  - **Likelihood**: High
  - **Impact**: Low (Phase 10 test may be optional)

### Mitigation Strategies

- **Generous Timeouts**: Use Playwright's default timeout (30s) and explicit waits for content
- **Flexible Locators**: Use `getByRole()` and `getByText()` with partial matches for genre names
- **Simple Assertions**: Focus on "content changed" rather than "exact card count" or "exact order"
- **Optional Complex Tests**: Mark Phase 10 (empty state) as optional if filter combination is unreliable

## Success Metrics

### Definition of Done

- [ ] Test file `e2e/movie-tv-browsing.spec.ts` created with phases 1-9 complete
- [ ] Phase 10 (empty state) completed or marked as optional
- [ ] All tests pass when running `pnpm test:e2e`
- [ ] Tests follow user-centric principles and use semantic locators
- [ ] Tests verify visible UI changes and content updates
- [ ] Tests cover media type toggle, genre filtering, sorting, reset, infinite scroll, URL persistence, card navigation, and bilingual support

### Quality Gates

- [ ] All tests pass locally on developer machine
- [ ] Tests pass in CI environment (GitHub Actions)
- [ ] Code review confirms tests follow best practices from CLAUDE.md
- [ ] Tests are clear, readable, and maintainable
- [ ] No arbitrary waits or technical implementation detail assertions
- [ ] Tests handle TMDB API slowness gracefully

## Dependencies & Prerequisites

### External Dependencies

- **Playwright**: Already installed and configured
- **Dev Server**: Automatically started by Playwright test runner
- **TMDB API**: Must be accessible for tests to fetch real data

### Internal Prerequisites

- **Browse Page Implementation**: Feature is already implemented in `src/app/[locale]/movie-database/(list)/page.tsx`
- **Filter Components**: MediaTypeToggle, GenreFilter, SortFilter, ResetFilter are implemented
- **MediaList Component**: Infinite scroll grid is implemented
- **TanStack Query**: Client-side data fetching is working
- **Translation Files**: Genre names and UI labels are localized
