# Implementation Plan: Professional Experience and Education Detail Pages E2E Tests

**Spec Reference:** `ai-artifacts/specs/004-detail-pages.md`
**Plan Created:** 2025-09-30
**Planning Scope:** Write Playwright E2E tests for experience and education detail pages

## Executive Summary

Create E2E tests for professional experience and education detail pages, covering header display (type, organization, role/degree, dates), content sections (responsibilities, technology stack, modules, projects), external link behavior, and bilingual support. Tests will verify all three experience pages (Citadel, Spotify, Wunderman Thompson Commerce) and all three education pages (University of Bristol, University of Nottingham, Altrincham Grammar School for Boys).

## Architecture Research

### Existing Patterns

- **Test Structure**: Tests organized in `e2e/` directory with `*.spec.ts` files
- **User-Centric Testing**: Focus on visible UI changes, semantic locators, and actual content verification
- **Semantic Locators**: Use `getByRole()` with accessible names and heading levels
- **Wait Strategy**: Wait for actual content visibility using `toBeVisible()`, never arbitrary timeouts
- **External Links**: Test that links open in new tabs and have correct href attributes

### Key Files and Components

- `src/app/[locale]/(home)/(details)/experiences/{slug}/page.tsx`: Experience detail pages (citadel, spotify, wunderman-thompson-commerce)
- `src/app/[locale]/(home)/(details)/education/{slug}/page.tsx`: Education detail pages (university-of-bristol, university-of-nottingham, altrincham-grammar-school-for-boys)
- `src/components/home/detail-page-title.tsx`: Shared header component displaying type, organization, role/degree, and dates
- `src/components/shared/anchor.tsx`: Link component for external project links

### Data Flow Analysis

Detail pages are fully server-rendered with static content:

1. User navigates to `/[locale]/experiences/{slug}` or `/[locale]/education/{slug}`
2. Server renders page with DetailPageTitle header and content sections
3. Header displays: h2 (type + organization), h1 (role/degree), time (dates)
4. Content includes paragraphs, lists (ul/li), and optional external links (Anchor component)
5. External links have `target="_blank"` and `rel="noopener noreferrer"`

### Integration Points

- **i18n System**: Detail pages use `getTranslations()` to fetch localized content from per-page translation JSON files
- **Next.js Routing**: URL pattern follows `/[locale]/experiences/{slug}` or `/[locale]/education/{slug}`
- **External Links**: Education pages may include GitHub project links using Anchor component

## Implementation Phases

### Phase 1: Experience Page Header Tests

**Goal:** Verify experience detail page headers display correctly with all required information
**Deliverable:** Test file `e2e/detail-pages.spec.ts` with experience header tests

#### Tasks

- [ ] Create test file `e2e/detail-pages.spec.ts` with describe block "Experience Detail Pages"
- [ ] Write test: "should display header with type, company, role, and dates for Citadel page"
  - Navigate to `/en/experiences/citadel`
  - Verify h2 contains "Experience - Citadel" (using `getByRole('heading', { level: 2 })`)
  - Verify h1 contains role text (e.g., "Software Engineer")
  - Verify time element displays dates (e.g., "2022 - 2023")
- [ ] Write test: "should display header for Spotify and Wunderman Thompson Commerce pages"
  - Navigate to `/en/experiences/spotify`
  - Verify h2, h1, and time elements are visible with correct content
  - Navigate to `/en/experiences/wunderman-thompson-commerce`
  - Verify h2, h1, and time elements are visible with correct content

#### Acceptance Criteria

- [ ] Test file created with describe block for experience pages
- [ ] All three experience page headers are verified
- [ ] Tests use semantic locators (`getByRole` with heading levels)
- [ ] Tests verify actual text content, not just element existence

#### Validation Strategy

- **Manual Verification**: Manually visit each experience page and verify header content
- **Code Review**: Ensure tests use semantic locators and verify visible content

---

### Phase 2: Experience Page Content Tests

**Goal:** Verify experience pages display responsibilities and technology stack lists
**Deliverable:** Tests for experience page content sections

#### Tasks

- [ ] Write test: "should display responsibilities and technology stack for Citadel page"
  - Navigate to `/en/experiences/citadel`
  - Verify responsibilities paragraph is visible (contains text about role)
  - Verify "Technology Stack" or similar text is visible
  - Verify technology list (ul) contains expected items (e.g., "React", "TypeScript", "AG Grid")
- [ ] Write test: "should display content for Spotify and Wunderman Thompson Commerce pages"
  - Navigate to `/en/experiences/spotify`
  - Verify responsibilities and technology list are visible
  - Navigate to `/en/experiences/wunderman-thompson-commerce`
  - Verify responsibilities and technology list are visible

#### Acceptance Criteria

- [ ] All three experience pages have content verified
- [ ] Tests check for visible paragraph text and list items
- [ ] Tests verify specific technology stack items are visible
- [ ] No reliance on CSS selectors or DOM structure

#### Validation Strategy

- **Manual Verification**: Manually check each page has responsibilities and technology lists visible
- **Code Review**: Ensure tests verify actual content text, not just element types

---

### Phase 3: Education Page Header Tests

**Goal:** Verify education detail page headers display correctly with all required information
**Deliverable:** Tests for education page headers

#### Tasks

- [ ] Add describe block "Education Detail Pages" to test file
- [ ] Write test: "should display header with type, institution, degree, and dates for University of Bristol page"
  - Navigate to `/en/education/university-of-bristol`
  - Verify h2 contains "Education - University of Bristol"
  - Verify h1 contains degree text (e.g., "BSc Computer Science")
  - Verify time element displays dates (e.g., "2019 - 2022")
- [ ] Write test: "should display header for University of Nottingham and Altrincham Grammar School pages"
  - Navigate to `/en/education/university-of-nottingham`
  - Verify h2, h1, and time elements are visible with correct content
  - Navigate to `/en/education/altrincham-grammar-school-for-boys`
  - Verify h2, h1, and time elements are visible with correct content

#### Acceptance Criteria

- [ ] All three education page headers are verified
- [ ] Tests use semantic locators and verify actual text content
- [ ] Header structure (h2, h1, time) is consistent across all pages

#### Validation Strategy

- **Manual Verification**: Manually visit each education page and verify header content
- **Code Review**: Ensure tests follow same patterns as experience page tests

---

### Phase 4: Education Page Content Tests

**Goal:** Verify education pages display grade, modules, and optional project links
**Deliverable:** Tests for education page content including external links

#### Tasks

- [ ] Write test: "should display grade, modules, and project links for University of Bristol page"
  - Navigate to `/en/education/university-of-bristol`
  - Verify grade paragraph is visible (e.g., "First Class Honours")
  - Verify modules list (ul) contains expected items
  - Verify "Example Projects" text is visible
  - Verify at least 2 external project links are visible (e.g., "Game of Life website", "Ray Tracer")
  - Check that project links have `target="_blank"` attribute
- [ ] Write test: "should display content for University of Nottingham and Altrincham Grammar School pages"
  - Navigate to `/en/education/university-of-nottingham`
  - Verify grade, modules are visible
  - Verify projects section if present
  - Navigate to `/en/education/altrincham-grammar-school-for-boys`
  - Verify grade, modules (if present) are visible

#### Acceptance Criteria

- [ ] All education pages have content verified
- [ ] External project links are verified to have correct attributes
- [ ] Tests handle optional sections gracefully (projects may not exist on all pages)
- [ ] Tests verify specific module/project names are visible

#### Validation Strategy

- **Manual Verification**: Click external links and verify they open in new tabs
- **Code Review**: Ensure tests check link attributes and visible content

---

### Phase 5: External Link Navigation Tests

**Goal:** Verify external project links have correct behavior (open in new tab, correct URLs)
**Deliverable:** Tests for external link attributes and navigation

#### Tasks

- [ ] Write test: "should open external project links in new tabs"
  - Navigate to `/en/education/university-of-bristol`
  - Find project link (e.g., "Game of Life website")
  - Verify link has `target="_blank"` attribute
  - Verify link has `rel` attribute containing "noopener noreferrer"
  - Verify link href points to expected GitHub URL
- [ ] Optionally test that clicking link doesn't navigate current page
  - Click external link
  - Verify current page URL hasn't changed (still on detail page)

#### Acceptance Criteria

- [ ] External links have correct attributes verified
- [ ] Tests check for security attributes (rel="noopener noreferrer")
- [ ] Tests verify href URLs are correct
- [ ] Optional: Tests verify clicking doesn't navigate away from current page

#### Validation Strategy

- **Manual Verification**: Right-click link and verify "Open in new tab" option works
- **Security Check**: Verify rel="noopener noreferrer" is present for security

---

### Phase 6: Direct URL Access Tests

**Goal:** Verify detail pages load correctly when accessed directly via URL (not from homepage cards)
**Deliverable:** Tests for direct URL navigation

#### Tasks

- [ ] Write test: "should load experience pages correctly when accessed directly"
  - Navigate directly to `/en/experiences/citadel` (not from homepage)
  - Verify page loads with correct header and content
  - Navigate directly to `/en/experiences/spotify`
  - Verify page loads correctly
- [ ] Write test: "should load education pages correctly when accessed directly"
  - Navigate directly to `/en/education/university-of-bristol`
  - Verify page loads with correct header and content
  - Navigate directly to `/en/education/university-of-nottingham`
  - Verify page loads correctly

#### Acceptance Criteria

- [ ] Direct URL navigation tests pass for multiple pages
- [ ] No difference in behavior between homepage navigation and direct URL access
- [ ] Page content loads correctly without prior navigation

#### Validation Strategy

- **Manual Verification**: Copy-paste URL directly in browser and verify page loads
- **Code Review**: Ensure tests navigate directly without prior page visits

---

### Phase 7: Bilingual Support Tests

**Goal:** Verify detail pages display correctly in both English and Chinese
**Deliverable:** Tests for translated content in both languages

#### Tasks

- [ ] Write test: "should display English content for experience pages"
  - Navigate to `/en/experiences/citadel`
  - Verify h2 contains "Experience" (not "经验")
  - Verify all visible text is in English
- [ ] Write test: "should display Chinese content for experience pages"
  - Navigate to `/zh/experiences/citadel`
  - Verify h2 contains Chinese translation of "Experience"
  - Verify dates and content sections display in Chinese
- [ ] Write test: "should display English and Chinese content for education pages"
  - Navigate to `/en/education/university-of-bristol`
  - Verify h2 contains "Education"
  - Navigate to `/zh/education/university-of-bristol`
  - Verify h2 contains Chinese translation of "Education"

#### Acceptance Criteria

- [ ] English and Chinese content tests pass for both experience and education pages
- [ ] Tests verify actual translated text, not just URL locale
- [ ] Header labels (type) are correctly translated
- [ ] Content sections display in appropriate language

#### Validation Strategy

- **Manual Verification**: Switch languages and verify content changes
- **Code Review**: Ensure tests check actual text content, not just URL

---

### Phase 8: Browser Back Navigation Tests

**Goal:** Verify browser back button works correctly from detail pages to homepage
**Deliverable:** Tests for back button navigation

#### Tasks

- [ ] Write test: "should navigate back to homepage using browser back button"
  - Navigate to `/en` homepage
  - Click Citadel experience card
  - Verify detail page loads
  - Use `page.goBack()` to go back
  - Verify homepage is visible again (h1 with headline text)
  - Repeat for education card navigation

#### Acceptance Criteria

- [ ] Back navigation test passes for both experience and education pages
- [ ] Homepage content is visible after going back
- [ ] No console errors during back navigation

#### Validation Strategy

- **Manual Verification**: Click cards, then click browser back button
- **Code Review**: Ensure tests use `page.goBack()` and verify homepage content

---

## Risk Assessment

### Potential Issues

- **Translation Changes**: If translated text changes, tests will need updates
  - **Likelihood**: Low
  - **Impact**: Low (straightforward fix)

- **Content Structure Changes**: If header component structure changes, tests may break
  - **Likelihood**: Low
  - **Impact**: Medium (would require test updates)

- **External Links Becoming Invalid**: GitHub project links may change or become unavailable
  - **Likelihood**: Low
  - **Impact**: Low (tests only check link attributes, not actual link validity)

### Mitigation Strategies

- **Semantic Locators**: Use heading levels and roles to avoid brittle CSS selectors
- **Content-Based Assertions**: Verify specific text content to catch translation or content changes early
- **Flexible External Link Tests**: Check link attributes (target, rel, href pattern) rather than exact URLs

## Success Metrics

### Definition of Done

- [ ] Test file `e2e/detail-pages.spec.ts` created with all 8 phases complete
- [ ] All tests pass when running `pnpm test:e2e`
- [ ] All three experience pages (Citadel, Spotify, Wunderman Thompson Commerce) are tested
- [ ] All three education pages (University of Bristol, University of Nottingham, Altrincham Grammar School) are tested
- [ ] Tests verify header structure, content sections, external links, and bilingual support
- [ ] Tests use semantic locators and verify visible UI changes

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

- **Detail Page Implementations**: All 6 detail pages (3 experience, 3 education) are already implemented
- **Translation Files**: Per-page translation JSON files exist for all detail pages
- **DetailPageTitle Component**: Shared header component is implemented
- **Anchor Component**: External link component is implemented
