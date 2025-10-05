# Implementation Plan: Trailer Modal Refactor

**Status:** completed
**Created:** 2025-10-04
**Completed on:** 2025-10-04
**Spec Reference:** `ai-artifacts/specs/009-media-detail-trailer.md`
**Planning Scope:** Refactor existing trailer modal implementation to use native dialog elements and implement responsive behavior (mobile flyout sheet vs desktop centered dialog)

## Executive Summary

The trailer modal currently uses a custom `Overlay` component that always slides in from the bottom, regardless of screen size. This refactor will:

1. Replace the custom overlay with native `<dialog>` elements for better accessibility and built-in features
2. Implement responsive behavior: mobile devices get a bottom flyout sheet, tablet/desktop get a centered dialog
3. Keep the existing `startViewTransition` utility for smooth animations (no experimental APIs)
4. Leverage native dialog features for focus management, backdrop, and keyboard accessibility

**Key Architectural Decision:** Use a single dialog element with responsive CSS rather than two separate components, maximizing code reuse while achieving different visual presentations.

## Architecture Research

### Existing Patterns

**Current Implementation:**

- **`src/components/shared/overlay.tsx`**: Custom overlay component using `createPortal`, manual view transition names, always slides from bottom
- **`src/utils/start-view-transition.ts`**: Utility wrapper around `document.startViewTransition` with `flushSync` fallback
- **`src/components/movie-database/trailer-button.tsx`**: Controls open/close state, calls `startViewTransition` utility

**View Transitions in Codebase:**

- Only `overlay.tsx` currently uses view transitions
- Uses inline `<style>` tags with view-transition pseudo-elements
- No other components use the ViewTransition pattern yet

**Styling Patterns:**

- StyleX for all styles
- Responsive breakpoints: `breakpoints.md` at `768px` (tablet), `breakpoints.lg` at `1080px`
- Design tokens: `space`, `color`, `layer`, `border`, `shadow` from `tokens.stylex.ts`

### Key Files and Components

- **`src/components/movie-database/trailer-button.tsx`**: Entry point, manages modal state
- **`src/components/shared/overlay.tsx`**: Current modal implementation (to be replaced)
- **`src/utils/start-view-transition.ts`**: Current view transition utility (will continue to be used)
- **`src/components/movie-database/trailer.tsx`**: Server component that fetches trailer data
- **`src/breakpoints.stylex.ts`**: Breakpoint definitions for responsive behavior

### Data Flow Analysis

```
Server: Trailer component (fetches trailer ID from TMDB)
  ↓
Client: TrailerButton (receives trailerId prop)
  ↓ (user clicks button)
Client: TrailerButton (calls startViewTransition, sets isOpen=true)
  ↓
Client: Overlay renders via portal
  ↓
Client: YouTube iframe loads and autoplays
```

**Post-refactor flow:**

```
Server: Trailer component (unchanged)
  ↓
Client: TrailerButton (receives trailerId prop)
  ↓ (user clicks button)
Client: TrailerButton (calls startViewTransition, sets isOpen=true)
  ↓
Client: Native dialog.showModal() with view transition animations
  ↓
Client: YouTube iframe loads and autoplays
```

### Integration Points

- **TMDB API**: No changes required (already fetching trailer data)
- **YouTube Embed API**: No changes required (iframe embed continues to work)
- **View Transitions API**: Already in use via `startViewTransition` utility
- **Native Dialog API**: Supported in all modern browsers (Safari 15.4+, Chrome 37+, Firefox 98+)

## Implementation Phases

### Phase 1: Create Native Dialog Component with Responsive Styling

**Goal:** Build a new `Dialog` component using native `<dialog>` element with responsive behavior
**Deliverable:** `src/components/shared/dialog.tsx` component that renders as flyout on mobile, centered on desktop

**Implementation Details:**

**Dialog Element Behavior:**

- `showModal()` opens modal + blocks page + traps focus + enables Escape key
- `close()` programmatically closes and triggers `close` event
- Native `close` event fires on Escape key, form submission, or `close()` call
- Clicking backdrop does NOT automatically close dialog - must implement manually
- `::backdrop` is only rendered when using `showModal()` (not `show()`)
- Do NOT use `tabindex` on `<dialog>` element itself (breaks accessibility)

**Focus Management:**

- First focusable element auto-focused on `showModal()`
- Focus automatically trapped within dialog (no manual focus trap needed)
- Focus returns to previously focused element on close (if still in DOM)
- Add `autofocus` attribute to close button for better UX

**View Transition Integration:**

- Dialog works with `view-transition-name` CSS property
- Use inline `<style>` tags with `::view-transition-new` and `::view-transition-old` pseudo-elements
- Animate with existing `startViewTransition` utility (wrap state changes)
- Cannot animate `::backdrop` exit (backdrop removed immediately from DOM on close)
- Workaround: Animate dialog only, backdrop fades via browser default

**Responsive Styling Strategy:**

- Single `<dialog>` element with responsive StyleX styles
- Mobile (< 768px): `position: fixed; bottom: 0; left: 0; right: 0; width: 100%`; border-radius on top corners only
- Desktop (>= 768px): `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 720px`; border-radius on all corners
- Reset default dialog styles: `border: none; padding: 0; max-width: none; max-height: none`

#### Tasks

- [x] Create `src/components/shared/dialog.tsx` with native `<dialog>` element
- [x] Reset default dialog styles: `border: none`, `padding: 0`, `max-width: none`, `max-height: none`, `margin: 0`
- [x] Implement responsive positioning using StyleX:
  - Mobile (up to `breakpoints.md`):
    - `position: fixed; bottom: 0; left: 0; right: 0; width: 100dvw`
    - `borderTopLeftRadius: border.radius_4; borderTopRightRadius: border.radius_4`
    - Height: auto based on content, `max-height: 90dvh`
  - Desktop (`breakpoints.md`+):
    - `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`
    - `width: auto; max-width: 720px` (to fit YouTube 16:9 aspect ratio)
    - `borderRadius: border.radius_4` on all corners
- [x] Style `::backdrop` pseudo-element using inline `<style>` tag (StyleX doesn't support pseudo-elements for native HTML elements):
  - `background-color: rgba(0, 0, 0, 0.7)`
- [x] Add padding, background color, shadow using design tokens
- [x] Add close button (`XIcon` from `@phosphor-icons/react`) with `autofocus` attribute
- [x] Position close button absolutely: mobile at `top: space._2, right: space._2`, desktop at `top: space._5, right: space._5`
- [x] Define props: `isOpen: boolean`, `onClose: () => void`, `children: ReactNode`, `ariaLabel?: string`
- [x] Use `useRef<HTMLDialogElement>(null)` to access dialog element
- [x] Use `useEffect` with `isOpen` dependency:
  - If `isOpen === true && !dialogRef.current.open`: call `dialogRef.current.showModal()`
  - If `isOpen === false && dialogRef.current.open`: call `dialogRef.current.close()`
- [x] Add `close` event listener on mount to call `onClose()` (handles Escape key, form submission, programmatic close)
- [x] Add `click` event handler on dialog to check if click target is dialog itself (backdrop click), then call `onClose()`
- [x] Add ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` or `aria-label`

#### Acceptance Criteria

- [ ] Dialog renders as flyout sheet on mobile screens (< 768px)
- [ ] Dialog renders centered on tablet/desktop screens (>= 768px)
- [ ] Backdrop is semi-transparent and blocks background interaction
- [ ] Close button is visible and positioned correctly on all screen sizes
- [ ] Clicking backdrop closes the dialog
- [ ] Pressing Escape key closes the dialog
- [ ] Focus is trapped within the dialog when open
- [ ] Focus returns to trigger button when dialog closes

#### Validation Strategy

- **Unit Tests**: Test that dialog opens/closes, handles keyboard events, manages focus
- **Manual Verification**:
  - Resize browser to test responsive breakpoints
  - Test keyboard navigation (Tab, Shift+Tab, Escape)
  - Test screen reader announcements
  - Test backdrop click to close
- **Responsive Testing**: Test on actual mobile device and desktop

---

### Phase 2: Implement View Transition Animations

**Goal:** Add smooth view transition animations using existing `startViewTransition` utility
**Deliverable:** Dialog component with view transition animations for responsive enter/exit

**Implementation Details:**

**Animation Approach:**

- Use `view-transition-name` on dialog element (must be unique across all rendered dialogs)
- Use `useCssId()` hook (already exists in codebase) to generate unique transition name
- Create inline `<style>` tag with `::view-transition-new(id)` and `::view-transition-old(id)` pseudo-elements
- Define StyleX keyframes for animations, reference them in pseudo-element styles

**Mobile Animation (< 768px):**

- Enter: Slide up from bottom (`transform: translateY(100dvh)` → `translateY(0)`)
- Exit: Slide down to bottom (`translateY(0)` → `translateY(100dvh)`)
- Duration: 300ms with `ease-out` timing

**Desktop Animation (>= 768px):**

- Enter: Fade + scale (`opacity: 0; transform: scale(0.95)` → `opacity: 1; transform: scale(1)`)
- Exit: Fade + scale reverse
- Duration: 200ms with `ease-in-out` timing

**Critical Implementation Note:**

- Cannot animate `::backdrop` exit (removed immediately from DOM on close)
- Only animate the dialog element itself
- `startViewTransition` utility already handles fallback for unsupported browsers

#### Tasks

- [x] Import `useCssId` hook from `@/hooks/use-css-id`
- [x] Generate unique ID: `const id = useCssId()`
- [x] Add `view-transition-name` style prop: `style={{ viewTransitionName: `${id}-dialog` }}`
- [x] Create StyleX keyframes for mobile slide animation:
  - `slideInMobile`: from `translateY(100dvh)` to `translateY(0)`
  - `slideOutMobile`: from `translateY(0)` to `translateY(100dvh)`
- [x] Create StyleX keyframes for desktop fade+scale:
  - `fadeScaleIn`: from `opacity: 0; transform: scale(0.95)` to `opacity: 1; transform: scale(1)`
  - `fadeScaleOut`: from `opacity: 1; transform: scale(1)` to `opacity: 0; transform: scale(0.95)`
- [x] Add inline `<style>` tag with responsive pseudo-element animations:
  ```css
  ::view-transition-new(${id}-dialog) {
    animation-name: ${slideInMobile};
    animation-duration: 300ms;
  }
  ::view-transition-old(${id}-dialog) {
    animation-name: ${slideOutMobile};
    animation-duration: 300ms;
  }
  @media (min-width: 768px) {
    ::view-transition-new(${id}-dialog) {
      animation-name: ${fadeScaleIn};
      animation-duration: 200ms;
    }
    ::view-transition-old(${id}-dialog) {
      animation-name: ${fadeScaleOut};
      animation-duration: 200ms;
    }
  }
  ```
- [x] Verify `startViewTransition` is already being called in `TrailerButton` (no changes needed here)
- [ ] Test animations on mobile and desktop breakpoints
- [ ] Test with `prefers-reduced-motion: reduce` (animations should be disabled)

#### Acceptance Criteria

- [ ] Dialog animates smoothly when opening (slides up on mobile, fades+scales on desktop)
- [ ] Dialog animates smoothly when closing (slides down on mobile, fades+scales on desktop)
- [ ] Animations respect `prefers-reduced-motion` setting
- [ ] No visual layout shifts during transitions
- [ ] Fallback gracefully on browsers without View Transition support

#### Validation Strategy

- **Manual Verification**:
  - Test animations on mobile and desktop breakpoints
  - Test with `prefers-reduced-motion: reduce` enabled
  - Test on browsers without View Transition support (verify graceful fallback)
- **Visual Testing**: Record videos of animations to verify smoothness
- **Performance**: Check animation performance with DevTools (60fps target)

---

### Phase 3: Update TrailerButton to Use New Dialog Component

**Goal:** Replace `Overlay` with new `Dialog` component in trailer feature
**Deliverable:** Trailer modal uses new Dialog component with all functionality intact

**Implementation Details:**

**TrailerButton Changes:**

- Import `Dialog` instead of `Overlay`
- Pass `ariaLabel` prop with movie/show title: `"Play trailer for [Title]"`
- YouTube iframe remains unchanged as dialog child
- No changes to `startViewTransition` calls (already correct)
- No changes to state management (already using `isOpen` boolean)

**ARIA Label Strategy:**

- Dialog should receive descriptive label via `ariaLabel` prop
- TrailerButton already receives content as children (e.g., "Play trailer")
- Need to pass movie/show title to TrailerButton for ARIA label
- Update `Trailer` component to pass title from TMDB data

**YouTube Iframe:**

- Current iframe props are correct: `width`, `height`, `src`, `frameBorder`, `allowFullScreen`
- Add `title` attribute for accessibility: `"Trailer video player"`
- Autoplay is already handled via YouTube embed URL parameter

#### Tasks

- [x] Update `src/components/movie-database/trailer.tsx` to fetch movie/show title from TMDB data
- [x] Pass title to `TrailerButton` via new `title` prop
- [x] Update `TrailerButton` props to accept `title: string`
- [x] Update `src/components/movie-database/trailer-button.tsx`:
  - Import `Dialog` instead of `Overlay`
  - Replace `<Overlay>` with `<Dialog>`
  - Add `ariaLabel` prop: `` `Trailer for ${title}` `` (e.g., "Trailer for The Matrix")
  - Add `title="Trailer video player"` attribute to iframe
- [x] Keep existing `startViewTransition` calls unchanged
- [x] Remove unused `Overlay` import
- [ ] Test trailer opens with animation
- [ ] Test video plays correctly
- [ ] Test all close methods (button, backdrop, Escape)
- [ ] Test with screen reader to verify ARIA labels are announced correctly

#### Acceptance Criteria

- [ ] Clicking "Play trailer" button opens the dialog with animation
- [ ] Dialog displays YouTube video player correctly
- [ ] Video autoplays when modal opens
- [ ] Close button dismisses the dialog
- [ ] Clicking backdrop dismisses the dialog
- [ ] Pressing Escape dismisses the dialog
- [ ] Focus returns to "Play trailer" button after closing
- [ ] Mobile shows flyout sheet, desktop shows centered dialog
- [ ] All spec requirements (FR-007 through FR-019) are satisfied

#### Validation Strategy

- **Unit Tests**: Test TrailerButton renders, opens/closes dialog, passes correct props
- **Manual Verification**:
  - Test on movie detail pages with trailers
  - Test all close methods (button, backdrop, Escape)
  - Test keyboard navigation
  - Test on mobile and desktop
- **Accessibility Testing**:
  - Run axe DevTools to check for violations
  - Test with screen reader (VoiceOver/NVDA)
  - Verify focus management with keyboard-only navigation

---

### Phase 4: Clean Up and Remove Old Code

**Goal:** Remove deprecated overlay component
**Deliverable:** Codebase with no unused code, all references updated

**Implementation Details:**

**Files to Check:**

- `src/components/shared/overlay.tsx` - Current custom overlay (to be deleted)
- `src/utils/start-view-transition.ts` - Keep this (still in use)
- Search for imports: `import { Overlay } from` or `import Overlay from`
- Check if `overlay.tsx` is used in any other features (search, navigation, etc.)

**Verification Steps:**

1. Use `grep -r "Overlay" src/` to find all references
2. Use `grep -r "overlay.tsx" src/` to find all imports
3. Check git history to see if overlay was used elsewhere and removed
4. Verify no other components depend on it

#### Tasks

- [x] Search codebase for all references to `Overlay` component: `grep -r "from.*overlay" src/`
- [x] Verify `overlay.tsx` imports (found `search-button.tsx` still uses it - keeping Overlay for now)
- [ ] **SKIPPED**: Delete `src/components/shared/overlay.tsx` (still used by SearchButton - out of scope)
- [x] Run `pnpm lint` to check for any broken imports
- [x] Run `pnpm build:tsc` to verify no TypeScript errors
- [x] Keep `src/utils/start-view-transition.ts` (still used by Dialog component)

**Note**: Overlay component is still in use by `search-button.tsx`. Removing it would require refactoring SearchButton to use the Dialog component, which is out of scope for this trailer modal refactor.

#### Acceptance Criteria

- [ ] No unused imports or files remain in the codebase
- [ ] All references to deprecated code are removed or updated
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm build:tsc` passes with no type errors
- [ ] `pnpm test` passes all tests

#### Validation Strategy

- **Static Analysis**:
  - Run `pnpm lint` to check for unused code
  - Run `pnpm build:tsc` to check for type errors
  - Use IDE to search for any remaining references
- **Test Suite**: Run `pnpm test` to ensure all tests pass

---

### Phase 5: Add Comprehensive Tests

**Goal:** Ensure refactored implementation is well-tested at unit and E2E levels
**Deliverable:** Full test coverage for Dialog component and trailer functionality

**Implementation Details:**

**Unit Test Strategy (Vitest + React Testing Library):**

- Test Dialog component in isolation with different props
- Mock `showModal()` and `close()` methods (native DOM methods)
- Test event handlers: `click` on backdrop, `close` event
- Test focus behavior (requires jsdom environment)
- Test responsive styles (check computed styles or class names)

**E2E Test Strategy (Playwright):**

- Use existing E2E test patterns from codebase
- Test on actual browsers with real dialog element
- Test on mobile and desktop viewports
- Test animations visually (check element positions before/after)
- Test keyboard navigation and screen reader compatibility

**Key Testing Challenges:**

- Native dialog `showModal()` may not work in jsdom - mock or skip
- View transitions may not work in test environment - test that animations are defined, not that they run
- Focus management requires real DOM - use E2E tests for comprehensive testing

**Test Files:**

- Create `src/components/shared/dialog.test.tsx` for Dialog unit tests
- Create `src/components/movie-database/trailer-button.test.tsx` for TrailerButton tests
- Update or create `e2e/trailer.spec.ts` for E2E tests

#### Tasks

- [ ] Write unit tests for Dialog component (`src/components/shared/dialog.test.tsx`):
  - Test dialog renders when `isOpen={true}`
  - Test that dialog does not render when `isOpen={false}`
  - Test `onClose` is called when close event fires
  - Test backdrop click calls `onClose` (simulate click on dialog element)
  - Test close button calls `onClose`
  - Test children are rendered correctly
  - Test `ariaLabel` prop is applied correctly
  - Mock `showModal()` and `close()` for jsdom compatibility
- [ ] Write unit tests for TrailerButton component (`src/components/movie-database/trailer-button.test.tsx`):
  - Test button renders with children text
  - Test button has PlayIcon
  - Test clicking button sets `isOpen` to true
  - Test Dialog receives correct `ariaLabel`
  - Test iframe has correct `src` with trailer ID
  - Test iframe has `title` attribute
- [ ] Write E2E test for trailer functionality (`e2e/trailer.spec.ts`):
  - Navigate to movie detail page with trailer (e.g., `/en/movie-database/movie/603`)
  - Wait for "Play trailer" button to be visible
  - Click "Play trailer" button
  - Wait for dialog to appear using `page.locator('dialog[open]')`
  - Verify iframe with YouTube embed is visible
  - Test close button: click and verify dialog closes
  - Reopen dialog, test Escape key: press Escape and verify dialog closes
  - Reopen dialog, test backdrop click: click backdrop area and verify dialog closes
  - Test on mobile viewport (`page.setViewportSize({ width: 375, height: 667 })`)
  - Test on desktop viewport (`page.setViewportSize({ width: 1280, height: 720 })`)
  - Verify focus returns to "Play trailer" button after closing
- [ ] Run `pnpm test` to verify all unit tests pass
- [ ] Run `pnpm test:e2e` to verify E2E test passes
- [ ] Update existing tests if any broke due to refactor

#### Acceptance Criteria

- [ ] Unit test coverage for Dialog component is comprehensive
- [ ] Unit test coverage for TrailerButton component is comprehensive
- [ ] E2E test covers all acceptance scenarios from spec
- [ ] All tests pass successfully
- [ ] Test coverage does not decrease from current baseline

#### Validation Strategy

- **Unit Tests**: Run `pnpm test`, verify all Dialog and TrailerButton tests pass
- **E2E Tests**: Run `pnpm test:e2e`, verify trailer test passes
- **Coverage Report**: Check coverage metrics to ensure adequate coverage

---

### Phase 6: Final Validation and Quality Assurance

**Goal:** Verify all spec requirements are met and implementation is production-ready
**Deliverable:** Production-ready trailer modal feature

**Implementation Details:**

**Spec Requirements Checklist (FR-007 through FR-019):**

- FR-007: Dialog opens when button clicked ✓
- FR-008: Mobile renders as flyout sheet from bottom ✓
- FR-009: Desktop renders centered ✓
- FR-010: Backdrop is semi-transparent ✓
- FR-011: Contains YouTube player ✓
- FR-012: Has visible close button ✓
- FR-013: Closes on backdrop click ✓
- FR-014: Closes on Escape key ✓
- FR-015: Video autoplays (YouTube embed parameter) ✓
- FR-016: Player has standard controls (YouTube default) ✓
- FR-017: Focus moves to dialog on open (native dialog behavior) ✓
- FR-018: Focus returns to button on close (native dialog behavior) ✓
- FR-019: Focus trapped in dialog (native dialog behavior) ✓

**Performance Requirements:**

- Modal open < 200ms: Measure with DevTools Performance tab
- Video load < 1s: Measure YouTube iframe load time (network dependent)

**Browser Testing Matrix:**

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Mobile Chrome (Android)

**Accessibility Testing:**

- axe DevTools: 0 violations
- Keyboard navigation: Tab, Shift+Tab, Escape, Enter all work
- Screen reader: VoiceOver (macOS/iOS) or NVDA (Windows)
- Focus indicators visible
- ARIA labels announced correctly

#### Tasks

- [ ] Review spec requirements (FR-007 through FR-019) using checklist above
- [ ] Run full test suite: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build:tsc`
- [ ] Test on real mobile device (iOS or Android):
  - Dialog slides from bottom
  - Backdrop blocks page interaction
  - Video plays
  - All close methods work
- [ ] Test on desktop browser:
  - Dialog appears centered
  - Backdrop dims page
  - Animations smooth
  - All close methods work
- [ ] Cross-browser testing:
  - Chrome: Test dialog, animations, video playback
  - Firefox: Test dialog, animations, video playback
  - Safari: Test dialog, animations, video playback
  - Note any browser-specific issues
- [ ] Performance testing:
  - Measure modal open time with DevTools (should be < 200ms)
  - Measure video load time (network dependent, should be < 1s on good connection)
  - Check animation frame rate (should be 60fps)
  - Test on low-end device if possible
- [ ] Accessibility audit:
  - Run axe DevTools extension, fix any violations
  - Test keyboard-only navigation (no mouse)
  - Test with screen reader (macOS VoiceOver or Windows NVDA)
  - Verify focus indicators are visible
  - Verify all interactive elements are reachable
  - Verify ARIA labels are announced
- [ ] Visual QA:
  - Compare mobile design to spec (flyout from bottom)
  - Compare desktop design to spec (centered modal)
  - Check spacing, colors, shadows match design tokens
  - Test responsive breakpoint at 768px (resize browser)
- [ ] Code review:
  - Review Dialog component code
  - Review TrailerButton changes
  - Check for any `any` types or type assertions
  - Verify no console errors or warnings
  - Check code follows project conventions

#### Acceptance Criteria

- [ ] All functional requirements from spec are implemented and verified
- [ ] All tests pass: lint, unit tests, E2E tests, build
- [ ] Modal opens within 200ms of button click (spec requirement)
- [ ] Video player loads within 1 second (spec requirement)
- [ ] No accessibility violations detected
- [ ] Performance meets spec requirements
- [ ] Works correctly on all supported browsers and devices

#### Validation Strategy

- **Checklist Review**: Go through spec and verify each requirement
- **Cross-browser Testing**: Test on Chrome, Firefox, Safari
- **Device Testing**: Test on iPhone, Android, tablet, desktop
- **Performance Metrics**: Measure with DevTools performance tab
- **Accessibility Audit**: Run axe DevTools, test with screen readers
- **Final Test Run**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build:tsc`

---

## Risk Assessment

### Potential Issues

- **View Transitions Browser Support**: View Transitions API not supported in older browsers
  - **Impact**: Low (fallback to instant transitions)
  - **Likelihood**: Medium (affects users on older browsers)

- **Dialog Element Styling Limitations**: Native dialog may have browser-specific styling quirks
  - **Impact**: Medium (visual inconsistencies)
  - **Likelihood**: Low (dialog element is well-supported)

- **Animation Performance**: View transitions may cause performance issues on low-end devices
  - **Impact**: Medium (poor user experience)
  - **Likelihood**: Low (View Transitions API is hardware-accelerated)

- **Focus Management Edge Cases**: Native dialog focus trap may conflict with React rendering
  - **Impact**: Medium (accessibility issues)
  - **Likelihood**: Low (dialog element handles this natively)

### Mitigation Strategies

- **Browser Support**:
  - Implement feature detection for View Transitions API
  - Provide instant (no animation) fallback for unsupported browsers
  - Test on older browsers to verify fallback works

- **Styling Quirks**:
  - Test dialog styling across all supported browsers early
  - Use CSS reset for dialog element if needed
  - Document any browser-specific workarounds

- **Performance**:
  - Test animations on low-end devices
  - Respect `prefers-reduced-motion` setting
  - Use `will-change` CSS property sparingly
  - Monitor performance with DevTools

- **Focus Management**:
  - Test keyboard navigation thoroughly
  - Use browser DevTools to inspect focus state
  - Verify focus trap works in all scenarios
  - Test with assistive technologies

## Success Metrics

### Definition of Done

- [ ] Trailer modal renders as flyout sheet on mobile (< 768px)
- [ ] Trailer modal renders centered on tablet/desktop (>= 768px)
- [ ] Modal uses native `<dialog>` element
- [ ] Animations use existing `startViewTransition` utility
- [ ] All spec functional requirements (FR-007 through FR-019) are implemented
- [ ] All acceptance scenarios from spec are satisfied
- [ ] All tests pass (lint, unit, E2E, build)
- [ ] No accessibility violations detected
- [ ] Performance meets spec requirements (< 200ms modal open, < 1s video load)
- [ ] Old `Overlay` component removed (startViewTransition utility kept)
- [ ] Code reviewed and approved

### Quality Gates

- [ ] Zero TypeScript errors (`pnpm build:tsc`)
- [ ] Zero linting errors (`pnpm lint`)
- [ ] 100% of unit tests passing (`pnpm test`)
- [ ] 100% of E2E tests passing (`pnpm test:e2e`)
- [ ] Zero axe accessibility violations
- [ ] Manual testing on mobile and desktop completed
- [ ] Manual testing on Chrome, Firefox, Safari completed
- [ ] Screen reader testing completed
- [ ] Keyboard-only navigation testing completed

## Dependencies & Prerequisites

### External Dependencies

- **View Transitions API**: Browser feature required for animations
  - **Browser Support**: Chrome 111+, Edge 111+, Safari 18+, Firefox 129+
  - **Fallback**: Graceful degradation to instant transitions

- **Dialog Element**: Native HTML element
  - **Browser Support**: Chrome 37+, Edge 79+, Safari 15.4+, Firefox 98+
  - **Fallback**: None needed (universal support in modern browsers)

### Internal Prerequisites

- [ ] Spec `009-media-detail-trailer.md` must be complete and approved
- [ ] Current trailer functionality must be working (baseline for comparison)
- [ ] StyleX configuration must be working (for responsive styles)
- [ ] Breakpoints must be defined (`breakpoints.md` at 768px)
- [ ] Design tokens must be available (`color`, `space`, `border`, etc.)

## Notes

- This refactor improves the implementation without changing the user-facing functionality
- The responsive behavior (mobile vs desktop) is a key improvement that aligns with the spec
- Using native dialog provides better accessibility out-of-the-box
- Keeping the existing `startViewTransition` utility avoids experimental API risks
- All existing trailer functionality (YouTube embed, autoplay, close methods) is preserved
