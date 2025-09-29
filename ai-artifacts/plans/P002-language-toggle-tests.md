# Implementation Plan: Language Toggle E2E Tests

**Spec Reference:** `ai-artifacts/specs/002-language-toggle.md`
**Plan Created:** 2025-09-29
**Planning Scope:** Playwright E2E testing for language toggle feature

## Executive Summary

This plan outlines minimal Playwright E2E tests for the language toggle feature. Tests will be consolidated to reduce overhead while covering core functionality and preventing regression. The implementation should prioritize current functionality over the specification—if behavior differs from the spec, we'll update the spec to match reality.

## Architecture Research

### Existing Patterns

- **E2E Testing Pattern**: `e2e/theme-toggle.spec.ts` has 4 comprehensive tests covering system detection, manual toggle, persistence, and advanced features
- **Language Toggle Implementation**: `src/components/shared/locale-selector.tsx`
  - Uses `MenuButton` with dropdown pattern
  - Two `MenuItem` options with `role="menuItem"`
  - Cookie storage: `NEXT_LOCALE`, 30-day expiration
  - URL-based routing: `/en/*` and `/zh/*`
  - Client-side navigation with `router.push()` and `router.refresh()`

### Key Files and Components

- `src/components/shared/locale-selector.tsx`: Main component with dropdown menu
- `src/components/shared/menu-button.tsx`: Dropdown behavior (open/close, backdrop)
- `src/components/shared/menu-item.tsx`: Navigation with lifecycle hooks
- `src/utils/pathname.ts`: `getLocalePath()` and `normalizePath()` utilities
- `src/constants.ts`: `LOCALE_COOKIE_NAME = "NEXT_LOCALE"`

### Data Flow Analysis

1. URL path determines current language (`/en/*` or `/zh/*`)
2. Click translate icon → dropdown opens
3. Click language option → sets cookie → navigates to new URL → refreshes content
4. Cookie persists for future visits (30 days)

## Implementation Phases

### Phase 1: Create Consolidated Language Toggle Tests

**Goal:** Create minimal test file with 2-3 tests covering all essential functionality
**Deliverable:** New file `e2e/language-toggle.spec.ts` with comprehensive but minimal tests

#### Tasks

- [x] Create test file with `test.describe("Language Toggle")` block
- [x] Add `beforeEach()` hook to clean cookies and navigate to clean state
- [x] Write Test 1: Language switching and URL updates
  - Navigate to `/` page (default English)
  - Verify English is active in dropdown
  - Switch to Chinese
  - Verify URL updates to `/zh`, cookie set
  - Switch back to English
  - Verify URL updates to `/` (default locale), cookie updated
- [x] Write Test 2: Cookie persistence and search parameter preservation
  - Navigate to `/?test=value` with search parameters
  - Switch to Chinese
  - Verify URL is `/zh?test=value` (params preserved)
  - Open new tab
  - Verify language preference persists (still Chinese)
  - Verify cookie `NEXT_LOCALE` exists with correct value

#### Acceptance Criteria

- [x] Test 1 validates bidirectional language switching
- [x] Test 2 validates both persistence and search param preservation
- [x] Tests follow existing patterns from `theme-toggle.spec.ts`
- [x] All tests pass consistently
- [x] Total tests: 2 (minimal and focused)

#### Implementation Notes

- Default locale (English) has no URL prefix per `i18nConfig` and `pathname.ts`
- Language button aria-label changes with locale: "Select a language" (EN) / "选择语言" (ZH)
- Client-side navigation requires `waitForFunction` instead of `waitForURL` events
- MenuItem uses `role="menuItem"` with specific aria-labels for accessibility

#### Validation Strategy

- **E2E Test**: Run `pnpm test:e2e` and verify all tests pass
- **Manual Test**: Walkthrough scenarios to ensure tests match behavior

---

### Phase 2: Validate Against Spec and Run Full Test Suite

**Goal:** Ensure tests match implementation, update spec if needed, verify all quality gates pass
**Deliverable:** Passing tests and updated specification (if needed)

#### Tasks

- [x] Run all E2E tests and verify they pass
- [x] Compare implementation behavior with spec requirements
- [x] Run full project test suite: `pnpm lint:changed && pnpm test && pnpm test:e2e && pnpm build:tsc`

#### Acceptance Criteria

- [x] All E2E tests pass consistently (2/2 language toggle tests passing)
- [x] Spec accurately reflects implementation behavior (no discrepancies found)
- [x] All project commands pass with no errors
- [x] Tests are simple and focused (not over-engineered)

#### Implementation Notes

- Spec matches implementation - no updates needed
- All quality gates passed:
  - `pnpm lint:changed` ✓
  - `pnpm test` ✓ (80 tests passed)
  - `pnpm test:e2e` ✓ (language toggle tests: 2/2 passing)
  - `pnpm build:tsc` ✓

#### Validation Strategy

- **Full Test Suite**: Run `pnpm test && pnpm test:e2e && pnpm build:tsc`
- **Spec Review**: Document any spec vs implementation differences
- **Manual Verification**: Walkthrough key acceptance scenarios

---

## Risk Assessment

### Potential Issues

- **Timing Issues**: Client-side navigation may have race conditions
  - **Mitigation**: Use `waitForLoadState('networkidle')` and strategic timeouts

- **Spec Discrepancies**: Implementation may differ from spec
  - **Mitigation**: Prioritize implementation behavior, update spec to match

### Mitigation Strategies

- Use explicit waits after navigation events
- Test cookie behavior in both E2E and manual testing
- Update spec documentation if implementation is correct but spec is outdated

## Success Metrics

### Definition of Done

- [x] 2 comprehensive tests cover core functionality
- [x] Tests pass consistently (no flakiness)
- [x] Spec matches implementation (no updates needed)
- [x] All quality gates pass: `pnpm lint:changed && pnpm test && pnpm test:e2e && pnpm build:tsc`

### Quality Gates

- [x] `pnpm test:e2e` passes (6/6 tests, including 2 language toggle tests)
- [x] `pnpm test` passes (80/80 unit tests)
- [x] `pnpm build:tsc` passes (no type errors)
- [x] `pnpm lint:changed` passes (no lint errors)

## Dependencies & Prerequisites

### External Dependencies

- Playwright (installed and configured)
- Dev server (auto-starts via `playwright.config.ts`)

### Internal Prerequisites

- Language toggle feature implemented ✓
- Test infrastructure ready ✓
