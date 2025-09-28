# Implementation Plan: Theme Toggle E2E Tests

**Spec Reference:** `ai-artifacts/specs/001-theme-toggle.md`
**Plan Created:** 2025-09-27
**Planning Scope:** Set up Playwright testing infrastructure and write end-to-end tests for the existing theme toggle feature

## Executive Summary

This plan establishes Playwright testing infrastructure for the project and implements comprehensive end-to-end tests for the existing theme toggle feature. The feature is already implemented with the `ThemeSwitch` component, the `useTheme` hook, and localStorage persistence. We will create automated tests to validate all 12 functional requirements from the specification.

## Architecture Research

### Existing Patterns

- **Testing Framework**: Vitest for unit/component tests (`vitest.config.mts`)
- **Package Management**: pnpm with specific version via packageManager field
- **Next.js Project**: React 19, TypeScript, StyleX for styling
- **Theme Implementation**: Client-side with system preference detection

### Key Files and Components

- `src/components/shared/theme-switch.tsx`: Main theme toggle component with visual indicators
- `src/hooks/use-theme.ts`: Theme state management with localStorage persistence
- `src/utils/theme-hack.ts`: Theme-related utilities
- `package.json`: Already includes `@playwright/test@^1.55.1` in devDependencies

### Data Flow Analysis

1. **Initial Load**: `useTheme` hook reads from localStorage or defaults to "system"
2. **System Detection**: `useMediaQuery` detects `(prefers-color-scheme: dark)`
3. **Manual Toggle**: Switch component calls `setTheme` → updates localStorage → triggers re-render
4. **Visual Updates**: Theme changes applied via document className and meta tag updates
5. **Reset Flow**: System button appears on hover/focus → resets to "system" preference

### Integration Points

- **localStorage**: Theme persistence across browser sessions
- **CSS Media Queries**: System preference detection via `(prefers-color-scheme: dark)`
- **Document API**: Theme application via `documentElement.className` and meta tags
- **Next.js**: SSR/client hydration considerations for theme initialization

## Implementation Phases

### Phase 1: Playwright Infrastructure Setup

**Goal:** Establish a Playwright testing foundation with proper configuration
**Deliverable:** A fully configured Playwright environment ready for test development

#### Tasks

- [x] Run `pnpm create playwright` to initialize Playwright with the standard setup
- [x] Configure for Chromium only (remove Firefox/WebKit from the config)
- [x] Configure a flexible base URL (defaults to `http://localhost:3000`, configurable via environment variables for production)
- [x] Update the generated npm scripts if needed
- [x] Create helper utilities for theme testing

#### Acceptance Criteria

- [x] `playwright.config.ts` exists with proper browser configuration
- [x] Test directory structure is established
- [x] `pnpm test:e2e` script is available and functional
- [x] A sample "hello world" test passes in Chromium
- [x] The configuration includes appropriate timeouts and retry settings

#### Validation Strategy

- **Setup Verification**: Successfully run `npx playwright install`
- **Configuration Test**: Execute a basic navigation test against the local dev server
- **Manual Verification**: Confirm test results appear in the expected output format

---

### Phase 2: Core Theme Toggle Tests

**Goal:** Implement tests for fundamental theme switching functionality
**Deliverable:** E2E tests covering basic toggle operations and visual verification

#### Tasks

- [ ] Write a test to navigate to the home page and locate the theme toggle component by aria-label
- [ ] Write a test to verify localStorage values after toggle interactions
- [ ] Write a test to check meta theme-color tag content updates
- [ ] Write a test to assert switch component aria-checked attribute changes
- [ ] Write a test to verify computed background color changes between themes
- [ ] Write a test using `emulateMedia` to validate system preference detection

#### Acceptance Criteria

- [ ] Tests pass for system preference detection with light/dark fallback
- [ ] Tests pass for manual theme toggle functionality
- [ ] Tests pass for visual indicator state verification
- [ ] Tests pass for theme persistence via localStorage
- [ ] Tests pass for meta tag updates during theme changes
- [ ] All theme toggle tests pass consistently

#### Validation Strategy

- **localStorage Verification**: Assert that theme values are stored correctly
- **Meta Tag Testing**: Verify that theme-color meta tag content updates correctly
- **Computed Style Testing**: Check that actual background color changes occur
- **Interaction Testing**: Verify that click events trigger proper theme changes
- **Accessibility Testing**: Validate the switch component's ARIA attributes

---

### Phase 3: Advanced Theme Features

**Goal:** Test complex theme behaviors, including persistence and system reset
**Deliverable:** Complete E2E test coverage for all specification requirements

#### Tasks

- [ ] Write a test using browser context isolation to verify theme persistence across sessions
- [ ] Write a test to hover/focus on the theme toggle and verify system reset button visibility
- [ ] Write a test to click the system reset button and verify the theme returns to system preference
- [ ] Write a test using `emulateMedia` changes to verify dynamic system preference detection
- [ ] Write a test to verify that meta theme-color tag updates correctly
- [ ] Write a performance test to measure theme transition completion time

#### Acceptance Criteria

- [ ] Tests pass for theme persistence across browser restarts using context isolation
- [ ] Tests pass for system reset button hover/focus behavior and visibility
- [ ] Tests pass for system reset functionality restoring system preference
- [ ] Tests pass for dynamic system preference change detection
- [ ] Tests pass for meta tag theme-color updates
- [ ] All advanced theme feature tests pass consistently

#### Validation Strategy

- **Session Testing**: Use Playwright's context isolation to test persistence
- **Hover/Focus Testing**: Programmatic hover and focus event testing
- **System Preference Simulation**: Use Playwright's `emulateMedia` to test preference changes
- **Performance Testing**: Measure theme transition completion time
- **Chromium Testing**: Validate behavior consistency in the Chromium environment

## Risk Assessment

### Potential Issues

- **Theme Detection Flakiness**: System preference detection may be inconsistent across browsers (medium impact, high likelihood)
- **Timing Issues**: Theme transitions might cause race conditions in tests (medium impact, medium likelihood)
- **Browser Compatibility**: Theme behavior differences across browser engines (medium impact, low likelihood)

### Mitigation Strategies

- **Robust Waiting**: Use Playwright's expect assertions with proper timeouts for theme changes
- **Visual Testing**: Include screenshot comparisons to catch visual regressions
- **Chromium Testing**: Focus on Chromium-specific behavior validation
- **Fallback Testing**: Explicitly test scenarios where system preference detection fails

## Success Metrics

### Definition of Done

- [ ] All 12 functional requirements from the specification have corresponding E2E tests
- [ ] Tests pass consistently in Chromium
- [ ] Playwright infrastructure is integrated with the existing development workflow
- [ ] Test execution time is under 5 minutes for the full suite
- [ ] Tests provide reliable local verification of theme functionality

### Quality Gates

- [ ] Test coverage includes all acceptance scenarios from the specification
- [ ] Visual regression testing is implemented for theme appearance
- [ ] Tests validate both functional behavior and visual presentation
- [ ] Documentation is provided for test maintenance and debugging
- [ ] Test flakiness is under 1% (less than 1 failure per 100 runs)

## Dependencies & Prerequisites

### External Dependencies

- **Playwright Installation**: Browser binaries must be downloaded via `npx playwright install`
- **Target Environment**: Tests can run against the local dev server (`pnpm dev`) or any deployed environment via base URL configuration
- **System Fonts**: Consistent font rendering across test environments

### Internal Prerequisites

- **Theme Feature Complete**: The existing theme toggle implementation must be stable
- **Test Environment**: Local development setup with the Next.js dev server
