# Implementation Plan: Movie and TV Show Detail Pages E2E Tests

**Spec Reference:** `ai-artifacts/specs/006-media-detail-pages.md`
**Plan Created:** 2025-09-30
**Planning Scope:** Write basic Playwright E2E tests for movie and TV show detail pages

## Executive Summary

Create E2E tests for movie and TV show detail pages, covering backdrop images, hero layout (title, rating, metadata, overview), trailer button functionality, similar content section, and bilingual support. Tests will use actual TMDB movie/TV IDs to verify real data display, focusing on user-visible behavior rather than implementation details.

## Architecture Research

### Existing Patterns

- **Test Structure**: Tests in `e2e/` directory with `*.spec.ts` files
- **User-Centric Testing**: Focus on visible UI changes, semantic locators, actual content verification
- **Semantic Locators**: Use `getByRole()` with heading levels, `getByText()` for buttons
- **Wait Strategy**: Wait for actual content using `toBeVisible()`, never arbitrary timeouts
- **Modal Testing**: Check for modal visibility and interaction (theme-toggle spec has similar patterns)

### Key Files and Components

- `src/app/[locale]/movie-database/[type]/[id]/page.tsx`: Detail page server component for movies and TV shows
- `src/components/movie-database/backdrop-image.tsx`: Backdrop hero image component
- `src/components/movie-database/trailer.tsx`: Trailer button component (server component that checks for trailer availability)
- `src/components/movie-database/trailer-button.tsx`: Client component that opens trailer modal
- `src/components/movie-database/similar-media.tsx`: Similar content section with horizontal scroll
- `src/components/movie-database/similar-media-list.tsx`: Client component that fetches similar content

### Data Flow Analysis

Detail pages are server-rendered with async data fetching:

1. User navigates to `/[locale]/movie-database/[type]/[id]`
2. Server validates type parameter ("movie" or "tv"), returns 404 if invalid
3. Server fetches movie/TV details, videos, and configuration from TMDB API
4. Page renders with backdrop image, hero section (rating, title, metadata, overview)
5. Trailer button renders only if official trailer is available (server-side check)
6. Similar content section loads asynchronously via client component
7. Clicking trailer button opens modal overlay (YouTube player)

### Integration Points

- **TMDB API**: Fetches movie/TV details, videos, and similar content
- **Next.js Routing**: URL pattern `/movie-database/[type]/[id]` where type is "movie" or "tv"
- **i18n System**: Localized content (title, overview, genres) from TMDB and UI labels from translations
- **Modal System**: Trailer opens in modal overlay (Radix UI Dialog)

## Implementation Phases

### Phase 1: Movie Detail Page Basic Content Tests

**Goal:** Verify movie detail page displays all required content sections
**Deliverable:** Test file `e2e/media-detail-pages.spec.ts` with movie page content tests

#### Tasks

- [ ] Create test file `e2e/media-detail-pages.spec.ts` with describe block "Movie Detail Pages"
- [ ] Choose a well-known movie ID for testing (e.g., ID 550 for "Fight Club" which consistently has data)
- [ ] Write test: "should display movie title, rating, and metadata"
  - Navigate to `/en/movie-database/movie/550`
  - Wait for h1 with movie title to be visible
  - Verify rating badge is visible with numeric rating (e.g., "8.4")
  - Verify vote count is visible below rating
  - Verify metadata line is visible with year, runtime, and genres (e.g., "1999 • 2h 19m • Drama")
- [ ] Write test: "should display movie overview or tagline"
  - Navigate to `/en/movie-database/movie/550`
  - Verify overview paragraph is visible (contains plot description text)
  - If overview is empty, verify tagline is visible as fallback

#### Acceptance Criteria

- [ ] Test file created with movie detail tests
- [ ] Tests use semantic locators (h1 for title, rating badge, paragraph for overview)
- [ ] Tests verify actual content is visible, not just element existence
- [ ] Tests use a reliable movie ID that consistently has full data

#### Validation Strategy

- **Manual Verification**: Manually visit `/en/movie-database/movie/550` and verify all content
- **Code Review**: Ensure tests use semantic locators and verify visible text

---

### Phase 2: TV Show Detail Page Basic Content Tests

**Goal:** Verify TV show detail page displays all required content sections
**Deliverable:** Tests for TV show page content

#### Tasks

- [ ] Add describe block "TV Show Detail Pages" to test file
- [ ] Choose a well-known TV show ID for testing (e.g., ID 1396 for "Breaking Bad")
- [ ] Write test: "should display TV show name, rating, and metadata"
  - Navigate to `/en/movie-database/tv/1396`
  - Wait for h1 with show name to be visible
  - Verify rating badge is visible with numeric rating
  - Verify vote count is visible below rating
  - Verify metadata line is visible with year, seasons/episodes, and genres (e.g., "2008 • 5 seasons • 62 episodes • Drama")
- [ ] Write test: "should display TV show overview or tagline"
  - Navigate to `/en/movie-database/tv/1396`
  - Verify overview paragraph is visible

#### Acceptance Criteria

- [ ] TV show detail tests pass
- [ ] Tests verify season/episode count format (e.g., "5 seasons • 62 episodes")
- [ ] Tests use semantic locators and verify visible content
- [ ] Tests use a reliable TV show ID with full data

#### Validation Strategy

- **Manual Verification**: Manually visit `/en/movie-database/tv/1396` and verify all content
- **Code Review**: Ensure tests follow same patterns as movie tests

---

### Phase 3: Backdrop Image Tests

**Goal:** Verify backdrop image displays correctly and handles missing images gracefully
**Deliverable:** Tests for backdrop image behavior

#### Tasks

- [ ] Write test: "should display backdrop image when available"
  - Navigate to `/en/movie-database/movie/550` (has backdrop)
  - Verify backdrop image element is visible (img tag or background image)
  - Verify backdrop has appropriate alt text (movie title)
- [ ] Write test: "should handle missing backdrop gracefully"
  - Find a movie ID without backdrop image (or use test data)
  - Navigate to detail page
  - Verify page loads without breaking (h1 title is still visible)
  - Verify no broken image icon is visible

#### Acceptance Criteria

- [ ] Backdrop image test verifies image is visible and has alt text
- [ ] Missing backdrop test verifies page doesn't break without image
- [ ] Tests check for visible content, not specific CSS properties

#### Validation Strategy

- **Manual Verification**: Check movie with and without backdrop
- **Decision Point**: Finding a movie without backdrop may be difficult - this test may be optional

---

### Phase 4: Trailer Button Tests

**Goal:** Verify trailer button appears when available and opens modal on click
**Deliverable:** Tests for trailer button visibility and modal behavior

#### Tasks

- [ ] Write test: "should display 'Watch Trailer' button when trailer is available"
  - Navigate to `/en/movie-database/movie/550` (known to have trailer)
  - Wait for "Watch Trailer" button (or localized text) to be visible
  - Verify button is clickable
- [ ] Write test: "should open trailer modal when button is clicked"
  - Navigate to `/en/movie-database/movie/550`
  - Wait for "Watch Trailer" button to be visible
  - Click trailer button
  - Wait for modal/dialog to be visible (check for role="dialog" or YouTube iframe)
  - Verify modal contains video player (iframe with YouTube URL)
- [ ] Write test: "should close trailer modal when close button is clicked"
  - Navigate to `/en/movie-database/movie/550`
  - Click "Watch Trailer" button
  - Wait for modal to be visible
  - Click close button (X or Esc key)
  - Verify modal is no longer visible
- [ ] Write test: "should not display trailer button when no trailer is available"
  - Find a movie ID without trailer (or use test data)
  - Navigate to detail page
  - Verify "Watch Trailer" button is not visible
  - Verify page loads correctly without trailer button

#### Acceptance Criteria

- [ ] Trailer button visibility tests pass
- [ ] Modal open/close tests pass
- [ ] Tests verify modal contains YouTube iframe
- [ ] Tests handle both trailer-available and no-trailer scenarios
- [ ] No arbitrary waits - wait for actual modal visibility

#### Validation Strategy

- **Manual Verification**: Click trailer button and verify modal opens with video
- **Code Review**: Ensure tests wait for modal visibility, not just button click
- **Decision Point**: Finding a movie without trailer may be difficult - that test may be optional

---

### Phase 5: Similar Content Section Tests

**Goal:** Verify similar movies/TV shows section displays and is horizontally scrollable
**Deliverable:** Tests for similar content section

#### Tasks

- [ ] Write test: "should display similar movies section with heading"
  - Navigate to `/en/movie-database/movie/550`
  - Scroll down to bottom of page
  - Verify h2 heading "Similar Movies" (or localized text) is visible
  - Verify at least 5-10 similar movie cards are visible
  - Verify cards display poster images
- [ ] Write test: "should display similar TV shows section"
  - Navigate to `/en/movie-database/tv/1396`
  - Scroll down to bottom of page
  - Verify h2 heading "Similar TV Shows" is visible
  - Verify similar TV show cards are visible
- [ ] Write test: "should navigate to similar content detail page when card is clicked"
  - Navigate to `/en/movie-database/movie/550`
  - Scroll to similar movies section
  - Click first similar movie card
  - Wait for new detail page to load (h1 with different movie title)
  - Verify URL changed to different movie ID
- [ ] Write test: "should not display similar content section when none available"
  - Find a movie ID with no similar content (or use test data)
  - Navigate to detail page
  - Verify "Similar Movies" heading is not visible (section hidden)

#### Acceptance Criteria

- [ ] Similar content section tests pass for both movies and TV shows
- [ ] Tests verify heading, cards, and poster images are visible
- [ ] Navigation test clicks card and verifies new detail page loads
- [ ] Tests handle scenario where no similar content is available
- [ ] Tests scroll to section if needed

#### Validation Strategy

- **Manual Verification**: Scroll to similar content section and click cards
- **Code Review**: Ensure tests scroll to section and wait for content visibility
- **Decision Point**: No-similar-content test may be optional if hard to find

---

### Phase 6: Direct URL Access and 404 Tests

**Goal:** Verify detail pages load correctly via direct URL and handle invalid IDs/types
**Deliverable:** Tests for URL routing and error handling

#### Tasks

- [ ] Write test: "should load movie page correctly when accessed directly via URL"
  - Navigate directly to `/en/movie-database/movie/550` (not from browse page)
  - Verify page loads with correct content (h1 with movie title)
- [ ] Write test: "should load TV show page correctly when accessed directly via URL"
  - Navigate directly to `/en/movie-database/tv/1396`
  - Verify page loads with correct content
- [ ] Write test: "should return 404 for invalid media type"
  - Navigate to `/en/movie-database/invalid-type/550`
  - Verify 404 page is displayed (check for "404" or "Not Found" text)
- [ ] Write test: "should return 404 for non-existent movie ID"
  - Navigate to `/en/movie-database/movie/999999999` (invalid ID)
  - Verify 404 page or error message is displayed

#### Acceptance Criteria

- [ ] Direct URL access tests pass
- [ ] Invalid media type test returns 404
- [ ] Non-existent ID test returns 404 or error
- [ ] Tests verify actual error page content, not just status code

#### Validation Strategy

- **Manual Verification**: Navigate to invalid URLs and verify 404 behavior
- **Code Review**: Ensure tests check for visible error content

---

### Phase 7: Runtime and Metadata Formatting Tests

**Goal:** Verify runtime formatting for short/long movies and season/episode formatting for TV shows
**Deliverable:** Tests for edge cases in metadata display

#### Tasks

- [ ] Write test: "should format runtime correctly for short movies (< 60 minutes)"
  - Find a short film (e.g., ID for 45-minute movie)
  - Navigate to detail page
  - Verify runtime displays as "45 minutes" (not "0 hours 45 minutes")
- [ ] Write test: "should format runtime correctly for long movies"
  - Navigate to `/en/movie-database/movie/550` (139 minutes = 2h 19m)
  - Verify runtime displays as "2h 19m" or "2 hours 19 minutes"
- [ ] Write test: "should format seasons and episodes with locale-appropriate numbers"
  - Navigate to `/en/movie-database/tv/1396`
  - Verify season/episode count displays with correct formatting (e.g., "5 seasons • 62 episodes")
  - Navigate to `/zh/movie-database/tv/1396`
  - Verify Chinese locale formatting (if different)

#### Acceptance Criteria

- [ ] Runtime formatting tests pass for short and long movies
- [ ] Season/episode formatting test passes
- [ ] Tests verify actual visible text, not calculated values

#### Validation Strategy

- **Manual Verification**: Check movies of different lengths and verify runtime format
- **Decision Point**: Short film test may be optional if hard to find appropriate movie ID

---

### Phase 8: Bilingual Support Tests

**Goal:** Verify detail pages display correctly in both English and Chinese
**Deliverable:** Tests for translated content and localized metadata

#### Tasks

- [ ] Write test: "should display English UI labels and localized content"
  - Navigate to `/en/movie-database/movie/550`
  - Verify UI labels are in English ("Watch Trailer", "Similar Movies")
  - Verify movie title, overview, and genres are in English (if available from TMDB)
- [ ] Write test: "should display Chinese UI labels and localized content"
  - Navigate to `/zh/movie-database/movie/550`
  - Verify UI labels are in Chinese
  - Verify movie title, overview, and genres are in Chinese (if available from TMDB)
- [ ] Write test: "should maintain language when navigating from similar content"
  - Navigate to `/zh/movie-database/movie/550`
  - Scroll to similar movies section
  - Click similar movie card
  - Verify new detail page URL contains `/zh/`
  - Verify new page content is in Chinese

#### Acceptance Criteria

- [ ] English and Chinese UI tests pass
- [ ] Tests verify actual translated text is visible
- [ ] Navigation maintains language preference
- [ ] Tests handle cases where TMDB may not have localized content

#### Validation Strategy

- **Manual Verification**: Switch languages and verify UI and content changes
- **Code Review**: Ensure tests check actual content text, not just URL locale

---

### Phase 9: Rating Display and Number Formatting Tests

**Goal:** Verify rating badge displays correctly with locale-appropriate number formatting
**Deliverable:** Tests for rating display

#### Tasks

- [ ] Write test: "should display rating formatted to 1 decimal place"
  - Navigate to `/en/movie-database/movie/550`
  - Verify rating badge shows number with 1 decimal (e.g., "8.4" not "8.43")
- [ ] Write test: "should display vote count with locale-appropriate formatting"
  - Navigate to `/en/movie-database/movie/550`
  - Verify vote count shows formatted number (e.g., "28,234" in English locale)
  - Navigate to `/zh/movie-database/movie/550`
  - Verify vote count shows Chinese locale formatting (if different)

#### Acceptance Criteria

- [ ] Rating format test verifies 1 decimal place
- [ ] Vote count format test verifies locale-appropriate formatting
- [ ] Tests check actual visible text

#### Validation Strategy

- **Manual Verification**: Check rating badge in both locales
- **Code Review**: Verify tests check number format, not just presence

---

## Risk Assessment

### Potential Issues

- **TMDB Data Changes**: Movie/TV metadata may change over time (titles, ratings, availability)
  - **Likelihood**: Low
  - **Impact**: Low (tests use well-known stable movies/shows)

- **Trailer Availability**: Trailers may be removed or become unavailable
  - **Likelihood**: Low
  - **Impact**: Low (use popular movies known to have trailers)

- **API Rate Limits**: Running tests may hit TMDB API rate limits
  - **Likelihood**: Medium
  - **Impact**: Medium (tests may timeout or fail intermittently)

- **Modal Interaction**: Modal open/close tests may be flaky due to animation timing
  - **Likelihood**: Medium
  - **Impact**: Low (Playwright auto-waits for visibility)

### Mitigation Strategies

- **Use Stable Movie/TV IDs**: Choose well-known, popular content (Fight Club, Breaking Bad) that consistently has full data
- **Flexible Assertions**: Check for content presence rather than exact text matches
- **Generous Timeouts**: Use Playwright's default 30s timeout for API-dependent content
- **Auto-Wait**: Rely on Playwright's auto-wait for modal visibility, not arbitrary sleeps

## Success Metrics

### Definition of Done

- [ ] Test file `e2e/media-detail-pages.spec.ts` created with all 9 phases complete
- [ ] All tests pass when running `pnpm test:e2e`
- [ ] Tests cover both movie and TV show detail pages
- [ ] Tests verify hero content, backdrop, trailer button, similar content, routing, and bilingual support
- [ ] Tests use semantic locators and verify visible UI changes
- [ ] Optional tests (no trailer, no similar content, short films) completed or marked as optional

### Quality Gates

- [ ] All tests pass locally on developer machine
- [ ] Tests pass in CI environment (GitHub Actions) with real TMDB API
- [ ] Code review confirms tests follow best practices from CLAUDE.md
- [ ] Tests are clear, readable, and maintainable
- [ ] No arbitrary waits or technical implementation detail assertions
- [ ] Tests handle TMDB API slowness gracefully

## Dependencies & Prerequisites

### External Dependencies

- **Playwright**: Already installed and configured
- **Dev Server**: Automatically started by Playwright test runner
- **TMDB API**: Must be accessible for tests to fetch real movie/TV data

### Internal Prerequisites

- **Detail Page Implementation**: Feature is already implemented in `src/app/[locale]/movie-database/[type]/[id]/page.tsx`
- **Trailer Component**: Trailer button and modal are implemented
- **Similar Media Component**: Similar content section is implemented
- **Backdrop Image Component**: Backdrop hero image is implemented
- **Translation Files**: UI labels are localized
