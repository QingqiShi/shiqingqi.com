# Implementation Plan: Homepage Portfolio E2E Tests

**Status:** completed
**Created:** 2025-09-30
**Completed on:** 2025-09-30
**Spec Reference:** `ai-artifacts/specs/003-homepage-portfolio.md`
**Planning Scope:** Write Playwright E2E tests for homepage portfolio display feature

## Executive Summary

Create comprehensive E2E tests for the homepage portfolio display, covering content sections (headline, biography, projects, experience, education), card navigation, responsive layout behavior, and bilingual support. Tests will follow user-centric principles by verifying visible UI changes rather than technical implementation details.

## Architecture Research

### Existing Patterns

- **Test Structure**: Tests organized in `e2e/` directory with `*.spec.ts` files
- **User-Centric Testing**: Existing tests (theme-toggle, language-toggle) focus on visible UI changes and semantic locators
- **Semantic Locators**: Prefer `getByRole()` over CSS selectors (e.g., `getByRole('button', { name: 'Select a language' })`)
- **Wait Strategy**: Wait for actual content visibility using `toBeVisible()` assertions rather than arbitrary timeouts
- **Test Organization**: Use `test.describe()` blocks to group related tests, `test.beforeEach()` for common setup

### Key Files and Components

- `src/app/[locale]/(home)/page.tsx`: Homepage server component with three sections (Projects, Experiences, Education)
- `src/components/home/project-card.tsx`: Project card component with icon, name, and description
- `src/components/home/experience-card.tsx`: Experience card component with logo, dates, and company name
- `src/components/home/education-card.tsx`: Education card component with logo, degree name, and dates
- `e2e/theme-toggle.spec.ts`: Reference for semantic locators and user-centric testing patterns
- `e2e/language-toggle.spec.ts`: Reference for bilingual testing patterns
- `playwright.config.ts`: Playwright configuration with automatic dev server startup

### Data Flow Analysis

Homepage is a fully server-rendered page with static content:

1. User navigates to `/` or `/en` or `/zh`
2. Server renders page with translated content from `translations.json`
3. Page displays headline, biography, and three card sections
4. Cards are `<a>` tags with `href` attributes pointing to detail pages
5. Click navigation is handled by Next.js routing

### Integration Points

- **i18n System**: Homepage uses `getTranslations()` to fetch localized content for headline, sections, and card labels
- **Next.js Routing**: Cards use `getLocalePath()` to generate locale-aware URLs
- **Responsive Layout**: Cards use StyleX with breakpoints for responsive grid (1, 2, 3, 4 columns)

## Implementation Phases

### Phase 1: Core Content Display Tests

**Goal:** Verify that all homepage content sections render correctly with proper structure
**Deliverable:** Test file `e2e/homepage-portfolio.spec.ts` with basic content visibility tests

#### Tasks

- [ ] Create test file `e2e/homepage-portfolio.spec.ts` with describe block
- [ ] Add `beforeEach` hook that navigates to `/` and waits for h1 heading visibility
- [ ] Write test: "should display headline and biography on page load"
  - Verify h1 heading is visible
  - Verify biography paragraph is visible
- [ ] Write test: "should display all three content sections with titles"
  - Verify "Projects" section heading (h2) is visible
  - Verify "Experiences" section heading (h2) is visible
  - Verify "Education" section heading (h2) is visible

#### Acceptance Criteria

- [ ] Test file created and tests pass
- [ ] All tests use semantic locators (`getByRole`)
- [ ] Tests verify visible UI elements, not implementation details
- [ ] No arbitrary waits or timeouts

#### Validation Strategy

- **Manual Verification**: Run `pnpm test:e2e` and confirm all tests pass
- **Code Review**: Verify tests follow existing patterns from theme-toggle and language-toggle specs

---

### Phase 2: Project Section Tests

**Goal:** Verify Movie Database project card displays correctly with all required elements
**Deliverable:** Tests for project card content and navigation

#### Tasks

- [ ] Write test: "should display Movie Database project card with icon, name, and description"
  - Verify project card link is visible with accessible name
  - Verify card contains icon (via SVG or role)
  - Verify project name text is visible
  - Verify description text is visible
- [ ] Write test: "should navigate to movie database when project card is clicked"
  - Click on Movie Database project card
  - Wait for URL to change to `/en/movie-database` or `/movie-database`
  - Verify movie database page content is visible (e.g., filter controls or movie grid)

#### Acceptance Criteria

- [ ] Project card content verification tests pass
- [ ] Navigation test successfully clicks card and verifies destination page
- [ ] Tests use semantic locators for links and verify visible navigation result
- [ ] No reliance on URL checking alone - verify destination page content is visible

#### Validation Strategy

- **Manual Verification**: Manually click project card and verify navigation works
- **Code Review**: Ensure navigation test waits for actual page content, not just URL change

---

### Phase 3: Experience Section Tests

**Goal:** Verify all three experience cards display correctly and navigate to detail pages
**Deliverable:** Tests for experience card content and navigation

#### Tasks

- [ ] Write test: "should display all three experience cards with logos, dates, and company names"
  - Verify Citadel card link is visible with accessible name "Software Engineer at Citadel"
  - Verify Spotify card link is visible with accessible name
  - Verify Wunderman Thompson Commerce card link is visible with accessible name
  - For each card, verify dates text is visible (e.g., "2022 - 2023")
- [ ] Write test: "should navigate to experience detail pages when cards are clicked"
  - Click Citadel experience card
  - Verify detail page content is visible (h1 with role/company name)
  - Go back to homepage
  - Repeat for Spotify and Wunderman Thompson Commerce cards

#### Acceptance Criteria

- [ ] All three experience cards are verified for visible content
- [ ] Navigation test successfully clicks each card and verifies detail page loads
- [ ] Tests use semantic locators and verify visible content, not URLs
- [ ] Browser back navigation works correctly between tests

#### Validation Strategy

- **Manual Verification**: Manually click each experience card and verify detail page loads
- **Code Review**: Ensure tests wait for actual page content after navigation

---

### Phase 4: Education Section Tests

**Goal:** Verify all three education cards display correctly and navigate to detail pages
**Deliverable:** Tests for education card content and navigation

#### Tasks

- [ ] Write test: "should display all three education cards with logos, degree names, and dates"
  - Verify University of Bristol card link is visible with accessible name
  - Verify University of Nottingham card link is visible with accessible name
  - Verify Altrincham Grammar School card link is visible with accessible name
  - For each card, verify degree/qualification name is visible
  - For each card, verify dates are visible
- [ ] Write test: "should navigate to education detail pages when cards are clicked"
  - Click University of Bristol card
  - Verify detail page content is visible (h1 with degree name)
  - Go back to homepage
  - Repeat for University of Nottingham and Altrincham Grammar School cards

#### Acceptance Criteria

- [ ] All three education cards are verified for visible content
- [ ] Navigation test successfully clicks each card and verifies detail page loads
- [ ] Tests use semantic locators and verify visible content, not URLs
- [ ] Browser back navigation works correctly between tests

#### Validation Strategy

- **Manual Verification**: Manually click each education card and verify detail page loads
- **Code Review**: Ensure tests wait for actual page content after navigation

---

### Phase 5: Responsive Layout Tests (Optional - Desktop Only)

**Goal:** Verify responsive grid layout behavior across different viewport sizes
**Deliverable:** Tests for responsive card layout (optional for basic test scope)

#### Tasks

- [ ] Write test: "should display cards in responsive grid layout"
  - Set viewport to mobile size (320px width)
  - Verify cards stack in single column (visual check via bounding box positions)
  - Set viewport to tablet size (768px width)
  - Verify cards display in 2-column grid
  - Set viewport to desktop size (1024px width)
  - Verify cards display in 3-column grid
  - Set viewport to large desktop (1440px width)
  - Verify cards display in 4-column grid

#### Acceptance Criteria

- [ ] Responsive layout test passes for all viewport sizes
- [ ] Test verifies card positions/layout, not just CSS properties
- [ ] Test is marked as optional for basic test coverage

#### Validation Strategy

- **Manual Verification**: Resize browser and verify card layout changes
- **Decision Point**: This test may be skipped for basic test coverage as it tests CSS implementation rather than user-visible functionality

---

### Phase 6: Bilingual Support Tests

**Goal:** Verify homepage content displays correctly in both English and Chinese
**Deliverable:** Tests for translated content in both languages

#### Tasks

- [ ] Write test: "should display English content when visiting /en"
  - Navigate to `/en`
  - Verify headline text is in English
  - Verify section titles are in English ("Projects", "Experiences", "Education")
  - Verify at least one card label is in English
- [ ] Write test: "should display Chinese content when visiting /zh"
  - Navigate to `/zh`
  - Verify headline text is in Chinese
  - Verify section titles are in Chinese
  - Verify at least one card label is in Chinese
- [ ] Write test: "should maintain language when navigating from cards"
  - Navigate to `/zh`
  - Click experience card
  - Verify detail page URL contains `/zh/`
  - Verify detail page content is in Chinese

#### Acceptance Criteria

- [ ] English and Chinese content tests pass
- [ ] Tests verify actual translated text is visible, not just URL locale
- [ ] Navigation maintains language preference across pages
- [ ] Tests use semantic locators and check for specific translated text

#### Validation Strategy

- **Manual Verification**: Manually switch languages and verify content changes
- **Code Review**: Ensure tests check actual content text, not just URL or DOM structure

---

## Risk Assessment

### Potential Issues

- **Flaky Tests**: Tests may fail if content loads slowly or navigation is delayed
  - **Likelihood**: Medium
  - **Impact**: Low (tests will retry on failure)

- **Translation Changes**: If translated text changes, tests will need updates
  - **Likelihood**: Low
  - **Impact**: Low (straightforward fix)

- **Responsive Layout Tests**: Testing CSS layout across viewports is fragile and may test implementation details
  - **Likelihood**: High
  - **Impact**: Low (Phase 5 is optional)

### Mitigation Strategies

- **Robust Wait Strategy**: Always wait for actual content visibility using `toBeVisible()`, never use arbitrary timeouts
- **Semantic Locators**: Use `getByRole()` with accessible names to avoid brittle CSS selectors
- **Content-Based Assertions**: Verify specific text content rather than just checking for element existence
- **Skip Responsive Tests**: Mark Phase 5 responsive layout tests as optional since they test implementation details

## Success Metrics

### Definition of Done

- [ ] Test file `e2e/homepage-portfolio.spec.ts` created with all phases 1-4 and 6 complete
- [ ] All tests pass when running `pnpm test:e2e`
- [ ] Tests follow user-centric principles from existing test patterns
- [ ] Tests use semantic locators and verify visible UI changes
- [ ] No arbitrary waits or technical implementation detail assertions
- [ ] Tests cover both English and Chinese content

### Quality Gates

- [ ] All tests pass locally on developer machine
- [ ] Tests pass in CI environment (GitHub Actions)
- [ ] Code review confirms tests follow best practices from CLAUDE.md
- [ ] Tests are clear, readable, and maintainable
- [ ] No console errors or warnings during test execution

## Dependencies & Prerequisites

### External Dependencies

- **Playwright**: Already installed and configured
- **Dev Server**: Automatically started by Playwright test runner

### Internal Prerequisites

- **Homepage Implementation**: Feature is already implemented in `src/app/[locale]/(home)/page.tsx`
- **Detail Pages**: Experience and education detail pages must exist for navigation tests
- **Translation Files**: Translation JSON files must exist for bilingual tests
