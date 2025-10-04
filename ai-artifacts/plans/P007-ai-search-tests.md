# Implementation Plan: AI-Powered Natural Language Movie and TV Show Search E2E Tests

**Status:** completed
**Created:** 2025-09-30
**Completed on:** 2025-09-30
**Spec Reference:** `ai-artifacts/specs/007-ai-movie-search.md`
**Planning Scope:** Write basic Playwright E2E tests for AI-powered natural language search feature

## Executive Summary

Create E2E tests for AI-powered search, covering search interface, natural language query processing, result display, error handling, and bilingual support. Tests will use actual OpenAI and TMDB APIs, so will be marked as potentially slower or flaky due to external dependencies. Focus will be on basic, reliable test scenarios rather than comprehensive edge cases.

## Architecture Research

### Existing Patterns

- **Test Structure**: Tests in `e2e/` directory with `*.spec.ts` files
- **User-Centric Testing**: Focus on visible UI changes, semantic locators, actual content verification
- **Semantic Locators**: Use `getByRole()`, `getByPlaceholder()`, `getByText()` for search input and results
- **Wait Strategy**: Wait for actual content using `toBeVisible()`, never arbitrary timeouts
- **Modal/Overlay Testing**: Similar patterns to theme-toggle tests (open overlay, interact, close)

### Key Files and Components

- `src/app/[locale]/movie-database/ai-search/page.tsx`: AI search results page with query display and results grid
- `src/components/movie-database/search-button.tsx`: Search button that opens search overlay modal
- `src/components/movie-database/search-content.tsx`: Server component that calls AI agent and displays results
- `src/components/movie-database/search-results-list.tsx`: Client component that renders result cards
- `src/ai/agent.ts`: AI agent that uses OpenAI function calling to translate natural language to TMDB parameters

### Data Flow Analysis

AI search with OpenAI and TMDB integration:

1. User clicks AI search button (sparkle icon) on browse page
2. Overlay modal opens with search input field
3. User enters natural language query (e.g., "recent superhero movies")
4. Form submits and navigates to `/movie-database/ai-search?q=recent+superhero+movies`
5. Server component calls `agent()` function with query and locale
6. AI agent uses OpenAI function calling to interpret query and call TMDB API
7. Results are rendered as poster cards in grid layout
8. If query is empty, empty state message displays
9. If no results, "No results found" message displays
10. Clicking result card navigates to detail page

### Integration Points

- **OpenAI API**: Interprets natural language queries using function calling
- **TMDB API**: Fetches movies/TV shows based on AI-interpreted parameters
- **Next.js Routing**: Search query in URL (`?q=query`) for shareability
- **i18n System**: Supports English and Chinese queries and result metadata

## Implementation Phases

### Phase 1: Search Interface Tests

**Goal:** Verify AI search button opens overlay and accepts input
**Deliverable:** Test file `e2e/ai-search.spec.ts` with basic search interface tests

#### Tasks

- [ ] Create test file `e2e/ai-search.spec.ts` with describe block "AI-Powered Search"
- [ ] Write test: "should display AI search button on browse page"
  - Navigate to `/en/movie-database`
  - Verify AI search button is visible (button with sparkle icon and "AI Search" label)
- [ ] Write test: "should open search overlay when AI search button is clicked"
  - Navigate to `/en/movie-database`
  - Click AI search button
  - Wait for overlay/modal to be visible (check for search input field)
  - Verify search input field is visible and focused
  - Verify placeholder text is visible (e.g., "Describe the movie or show you're looking for")
- [ ] Write test: "should close search overlay when ESC is pressed"
  - Navigate to `/en/movie-database`
  - Click AI search button
  - Wait for overlay to be visible
  - Press ESC key
  - Verify overlay is no longer visible

#### Acceptance Criteria

- [ ] Test file created with search interface tests
- [ ] Tests verify AI search button is visible on browse page
- [ ] Overlay open/close tests pass
- [ ] Tests use semantic locators for button and input field
- [ ] No arbitrary waits - wait for actual overlay visibility

#### Validation Strategy

- **Manual Verification**: Click AI search button and verify overlay opens/closes
- **Code Review**: Ensure tests wait for overlay visibility, not just button click

---

### Phase 2: Basic Search Query Tests

**Goal:** Verify submitting a query navigates to results page and displays results
**Deliverable:** Tests for basic search functionality with simple queries

#### Tasks

- [ ] Write test: "should display query at top of results page"
  - Navigate to `/en/movie-database`
  - Click AI search button
  - Enter query "superhero movies" in search input
  - Submit form (press Enter or click submit if available)
  - Wait for results page to load (`/movie-database/ai-search?q=superhero+movies`)
  - Verify h1 heading "AI Search Results" (or localized text) is visible
  - Verify query text "superhero movies" is displayed prominently (e.g., in quotes)
- [ ] Write test: "should display loading skeletons while processing query"
  - Navigate to `/en/movie-database`
  - Click AI search button
  - Enter query "action movies"
  - Submit form
  - Wait for results page to load
  - Verify loading skeletons (20 cards) are visible initially
  - Wait for actual results to replace skeletons
- [ ] Write test: "should display search results as poster cards"
  - Navigate to `/en/movie-database/ai-search?q=superhero+movies`
  - Wait for results to be visible (loading completes)
  - Verify at least 5-10 poster cards are visible
  - Verify cards display poster images, titles, and ratings
  - Verify cards match browse page design (consistent styling)

#### Acceptance Criteria

- [ ] Query display test verifies query text is visible on results page
- [ ] Loading state test verifies skeletons appear during processing
- [ ] Results display test verifies poster cards are visible with correct structure
- [ ] Tests wait for actual results to load (AI + TMDB processing may take 3-5 seconds)
- [ ] Tests handle potential API slowness with generous timeouts

#### Validation Strategy

- **Manual Verification**: Submit various queries and verify results display
- **Code Review**: Ensure tests wait for actual results, not just page load
- **Performance Note**: These tests may be slow (5-10 seconds) due to OpenAI API

---

### Phase 3: Natural Language Query Tests

**Goal:** Verify AI interprets different types of natural language queries correctly
**Deliverable:** Tests for genre-based, time-based, and rating-based queries

#### Tasks

- [ ] Write test: "should interpret genre-based queries"
  - Navigate to AI search page with query "comedy movies"
  - Wait for results to be visible
  - Verify results are displayed (at least some cards)
  - Verify URL contains `?q=comedy+movies`
- [ ] Write test: "should interpret time-based queries"
  - Navigate to AI search page with query "movies from the 90s"
  - Wait for results to be visible
  - Verify results are displayed
- [ ] Write test: "should interpret rating-based queries"
  - Navigate to AI search page with query "highly rated movies"
  - Wait for results to be visible
  - Verify results are displayed
- [ ] Write test: "should handle complex multi-criteria queries"
  - Navigate to AI search page with query "action movies from the 90s with high ratings"
  - Wait for results to be visible
  - Verify results are displayed

#### Acceptance Criteria

- [ ] All query type tests pass
- [ ] Tests verify results are visible, not specific content (AI may return different results)
- [ ] Tests use simple, reliable queries that consistently return results
- [ ] Tests wait for AI processing to complete (3-5 seconds)

#### Validation Strategy

- **Manual Verification**: Submit various query types and verify AI returns relevant results
- **Decision Point**: Verifying result accuracy (e.g., "all are comedies") is complex - just check that results appear

---

### Phase 4: Empty State and No Results Tests

**Goal:** Verify empty state message when no query entered and no results when query returns nothing
**Deliverable:** Tests for empty state and no results scenarios

#### Tasks

- [ ] Write test: "should display empty state message when no query is entered"
  - Navigate directly to `/en/movie-database/ai-search` (no query parameter)
  - Verify empty state message is visible (e.g., "Enter a search query to find movies and TV shows")
  - Verify no poster cards are visible
  - Verify no loading skeletons are visible
- [ ] Write test: "should display 'No results found' when query returns zero results"
  - Find a query that reliably returns no results (e.g., very specific nonsense query)
  - Navigate to `/en/movie-database/ai-search?q=asdfghjkl+nonexistent+movie`
  - Wait for processing to complete
  - Verify "No results found" message is visible
  - Verify no poster cards are visible

#### Acceptance Criteria

- [ ] Empty state test verifies message is visible when no query
- [ ] No results test verifies message is visible when AI/TMDB returns zero results
- [ ] Tests wait for processing to complete before checking for messages

#### Validation Strategy

- **Manual Verification**: Visit AI search page without query and with nonsense query
- **Decision Point**: Finding a query that always returns zero results may be difficult - this test may be flaky or optional

---

### Phase 5: Result Card Navigation Tests

**Goal:** Verify clicking result cards navigates to detail pages
**Deliverable:** Tests for result card click navigation

#### Tasks

- [ ] Write test: "should navigate to movie detail page when result card is clicked"
  - Navigate to `/en/movie-database/ai-search?q=superhero+movies`
  - Wait for results to be visible
  - Click first poster card
  - Wait for detail page to load (h1 with movie title)
  - Verify URL matches pattern `/en/movie-database/movie/[id]`
- [ ] Write test: "should navigate to TV show detail page when result is a TV show"
  - Navigate to `/en/movie-database/ai-search?q=sci-fi+tv+shows`
  - Wait for results to be visible
  - Click first poster card (TV show)
  - Wait for detail page to load
  - Verify URL matches pattern `/en/movie-database/tv/[id]`

#### Acceptance Criteria

- [ ] Card navigation tests pass for both movies and TV shows
- [ ] Tests verify destination page content is visible (h1 with title)
- [ ] Tests verify URL pattern matches expected structure
- [ ] Tests wait for actual page content, not just URL change

#### Validation Strategy

- **Manual Verification**: Click result cards and verify detail page loads
- **Code Review**: Ensure tests wait for detail page content, not just navigation

---

### Phase 6: URL Persistence and Shareability Tests

**Goal:** Verify search queries persist in URL and page can be accessed directly
**Deliverable:** Tests for URL-based query persistence

#### Tasks

- [ ] Write test: "should include search query in URL for shareability"
  - Navigate to `/en/movie-database`
  - Click AI search button
  - Enter query "comedy movies"
  - Submit form
  - Wait for results page to load
  - Verify URL contains `?q=comedy+movies`
- [ ] Write test: "should load results when accessing search URL directly"
  - Navigate directly to `/en/movie-database/ai-search?q=action+movies`
  - Wait for results to be visible
  - Verify query text "action movies" is displayed at top
  - Verify results are displayed
- [ ] Write test: "should maintain query after page refresh"
  - Navigate to `/en/movie-database/ai-search?q=comedy+movies`
  - Wait for results to be visible
  - Reload page using `page.reload()`
  - Wait for results to be visible again
  - Verify query is still displayed and results are visible

#### Acceptance Criteria

- [ ] URL persistence tests pass
- [ ] Direct URL access test loads results correctly
- [ ] Page refresh test maintains query and re-processes search
- [ ] Tests verify both URL and visible content

#### Validation Strategy

- **Manual Verification**: Submit query, copy URL, open in new tab, verify same results
- **Code Review**: Ensure tests verify visible content, not just URL

---

### Phase 7: Bilingual Support Tests

**Goal:** Verify AI search works correctly in both English and Chinese
**Deliverable:** Tests for bilingual query support and result localization

#### Tasks

- [ ] Write test: "should accept and process English queries"
  - Navigate to `/en/movie-database`
  - Click AI search button
  - Enter English query "action movies"
  - Submit form
  - Wait for results to be visible
  - Verify results display with English titles and metadata (if available from TMDB)
- [ ] Write test: "should accept and process Chinese queries"
  - Navigate to `/zh/movie-database`
  - Click AI search button (Chinese label)
  - Enter Chinese query "动作电影" (action movies)
  - Submit form
  - Wait for results to be visible
  - Verify results display with Chinese titles and metadata (if available from TMDB)
- [ ] Write test: "should display English UI labels for English locale"
  - Navigate to `/en/movie-database/ai-search?q=action+movies`
  - Verify h1 heading is in English ("AI Search Results")
  - Verify empty state and no results messages are in English (if applicable)
- [ ] Write test: "should display Chinese UI labels for Chinese locale"
  - Navigate to `/zh/movie-database/ai-search?q=动作电影`
  - Verify h1 heading is in Chinese
  - Verify UI labels are in Chinese

#### Acceptance Criteria

- [ ] English and Chinese query tests pass
- [ ] Tests verify AI processes queries in both languages
- [ ] UI label tests verify localized text
- [ ] Tests handle cases where TMDB may not have localized metadata

#### Validation Strategy

- **Manual Verification**: Switch languages and submit queries in both English and Chinese
- **Code Review**: Ensure tests check actual translated content

---

### Phase 8: Error Handling Tests (Optional)

**Goal:** Verify graceful error handling when OpenAI or TMDB APIs fail
**Deliverable:** Optional tests for error scenarios

#### Tasks

- [ ] Write test: "should display error message when API fails" (optional)
  - Difficult to test without mocking or forcing API failure
  - May skip this test as it requires infrastructure setup
- [ ] Write test: "should handle very long queries gracefully" (optional)
  - Navigate to AI search
  - Enter query longer than 500 characters (max query length per spec)
  - Verify query is truncated or validation error is shown

#### Acceptance Criteria

- [ ] Error handling tests are optional
- [ ] If implemented, tests verify user-friendly error messages are visible
- [ ] Tests do not expose technical error details

#### Validation Strategy

- **Decision Point**: Error handling tests may be skipped as they require API mocking or forced failures
- **Long Query Test**: This test may be optional as frontend validation is not currently implemented

---

## Risk Assessment

### Potential Issues

- **OpenAI API Rate Limits**: Tests may hit rate limits if run frequently
  - **Likelihood**: Medium
  - **Impact**: High (tests will fail)

- **OpenAI API Costs**: Each test query costs money
  - **Likelihood**: High
  - **Impact**: Low (minimal cost per test, but adds up)

- **OpenAI API Slowness**: AI processing may take 3-5+ seconds
  - **Likelihood**: High
  - **Impact**: Medium (tests will be slow)

- **Inconsistent Results**: AI may return different results for same query
  - **Likelihood**: Medium
  - **Impact**: Low (tests check for "results exist", not specific content)

- **No Results Queries**: Finding queries that always return zero results is difficult
  - **Likelihood**: High
  - **Impact**: Low (Phase 4 test may be flaky or optional)

### Mitigation Strategies

- **Generous Timeouts**: Use 30-60 second timeouts for AI search tests (longer than standard tests)
- **Flexible Assertions**: Check that results exist, not specific titles or counts
- **Simple Queries**: Use common, reliable queries (e.g., "action movies", "comedy") that consistently return results
- **Mark as Slow**: Mark AI search tests as slow or potentially flaky in CI configuration
- **Cost Awareness**: Document that these tests incur API costs; consider running less frequently or only on main branch

## Success Metrics

### Definition of Done

- [ ] Test file `e2e/ai-search.spec.ts` created with phases 1-7 complete
- [ ] Phase 8 (error handling) completed or marked as optional
- [ ] All tests pass when running `pnpm test:e2e` (may be slow due to API calls)
- [ ] Tests cover search interface, query processing, result display, empty states, navigation, URL persistence, and bilingual support
- [ ] Tests use semantic locators and verify visible UI changes
- [ ] Tests handle API slowness with generous timeouts

### Quality Gates

- [ ] All tests pass locally on developer machine (may take 1-2 minutes due to API calls)
- [ ] Tests pass in CI environment (GitHub Actions) with real OpenAI and TMDB APIs
- [ ] Code review confirms tests follow best practices from CLAUDE.md
- [ ] Tests are clear, readable, and maintainable
- [ ] No arbitrary waits - tests wait for actual content visibility
- [ ] Tests are documented as potentially slow and API-cost-incurring

## Dependencies & Prerequisites

### External Dependencies

- **Playwright**: Already installed and configured
- **Dev Server**: Automatically started by Playwright test runner
- **OpenAI API**: Must have valid API key configured (OPENAI_API_KEY environment variable)
- **TMDB API**: Must have valid API key configured
- **API Keys**: Tests require active API keys and may incur costs

### Internal Prerequisites

- **AI Search Page Implementation**: Feature is already implemented in `src/app/[locale]/movie-database/ai-search/page.tsx`
- **Search Button Component**: Search overlay modal is implemented
- **AI Agent**: OpenAI function calling agent is implemented in `src/ai/agent.ts`
- **Search Results Component**: Result grid and cards are implemented
- **Translation Files**: UI labels are localized

## Special Considerations

### API Costs

- Each test query incurs OpenAI API costs (typically $0.01-0.03 per query)
- Running full test suite may cost $0.10-0.50 depending on query complexity
- Consider running AI search tests less frequently (e.g., only on main branch, not on every PR)

### Test Execution Time

- AI search tests will be significantly slower than other E2E tests (3-5 seconds per query)
- Full test suite may take 1-2 minutes due to OpenAI API processing time
- Mark tests as slow in Playwright configuration to set expectations

### Flakiness Potential

- These tests have higher flakiness potential due to external API dependencies
- OpenAI may return different results for the same query
- TMDB API may be temporarily unavailable
- Consider retrying failed tests automatically in CI (Playwright supports retry on failure)
