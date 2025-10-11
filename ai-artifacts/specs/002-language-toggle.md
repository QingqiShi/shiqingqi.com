# Feature Specification: Language Toggle

**Version**: 2.0
**Last Updated**: 2025-10-11

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a website visitor, I want to switch between English and Chinese languages so that I can view and interact with content in my preferred language. The system should detect my language preference from the URL or saved preference, and allow me to easily switch languages while preserving my current location and any search parameters.

**Note**: English is the default locale and uses no URL prefix (e.g., `/experiences/citadel`). Chinese uses the `/zh/` prefix (e.g., `/zh/experiences/citadel`).

### Acceptance Scenarios

1. **Given** a user is on an English page (URL without prefix, e.g., `/page`), **When** they click the language selector and select Chinese, **Then** they should see Chinese content with URL `/zh/page`
2. **Given** a user is on a Chinese page (URL with `/zh/` prefix, e.g., `/zh/page`), **When** they click the language selector and select English, **Then** they should see English content with URL `/page`
3. **Given** a user previously selected Chinese, **When** they manually navigate to `/page` in the address bar, **Then** they should be redirected to `/zh/page`
4. **Given** a user is on a page with search parameters (e.g., `/page?query=test`), **When** they switch languages, **Then** the search parameters should be preserved (e.g., `/zh/page?query=test`)
5. **Given** a user previously selected Chinese, **When** they close the browser, reopen it, and navigate to `/`, **Then** they should be redirected to `/zh/` (preference persists across browser sessions)

### Edge Cases

**First-time visitors (no saved preference):**

- Visiting a URL without locale prefix (e.g., `/page`) → detect browser language preference and redirect accordingly (stay at `/` for English or redirect to `/zh/` for Chinese)
- Visiting a URL with locale prefix (e.g., `/zh/page`) → use the prefix locale regardless of browser preference

**Returning visitors (with saved preference):**

- After switching language, the preference becomes "sticky" across page reloads and navigation
- Manually navigating to a path without prefix (e.g., `/page`) → auto-redirect to match saved preference (e.g., `/zh/page` if previously selected Chinese)
- Manually navigating to a path with explicit prefix (e.g., `/zh/page`) → prefix always takes precedence over saved preference

**Other:**

- Language preference persists across browser sessions for up to 1 year
- Missing translations in target language → display English content as fallback

## Requirements _(mandatory)_

### Functional Requirements

#### Language Detection and Display

- **FR-001**: System MUST detect the current language from the URL path: English (default locale) has no prefix (e.g., `/experiences/citadel`), Chinese uses `/zh/` prefix (e.g., `/zh/experiences/citadel`)
- **FR-002**: System MUST display a language selector button with a translate icon in the header navigation
- **FR-003**: System MUST support both English (🇬🇧) and Chinese (🇨🇳) with appropriate flag indicators
- **FR-004**: System MUST detect browser language preference ONLY when user has no saved locale preference AND visits a URL without locale prefix, then redirect to appropriate locale

#### Dropdown Menu Behavior

- **FR-005**: System MUST show a dropdown menu with both English and Chinese options when the language selector is clicked
- **FR-006**: System MUST visually indicate the currently active language in the dropdown menu (highlighted/disabled state)
- **FR-007**: System MUST focus on the inactive language option when the dropdown opens for keyboard accessibility
- **FR-008**: System MUST close the language dropdown after a selection is made
- **FR-009**: System MUST handle the dropdown closing when clicking outside or losing focus

#### Language Switching and Navigation

- **FR-010**: System MUST immediately switch the page language when a different language option is selected
- **FR-011**: System MUST update the URL path to reflect the new language (e.g., `/page` to `/zh/page` or `/zh/page` to `/page`)
- **FR-012**: System MUST preserve all existing search parameters when switching languages
- **FR-013**: System MUST apply locale selection precedence rules: explicit URL prefix takes precedence, otherwise use saved preference, otherwise detect from browser
- **FR-014**: System MUST persist selected locale across navigation and browser sessions for up to 1 year

#### Accessibility

- **FR-015**: System MUST provide proper ARIA labels for accessibility: "Switch to English" for the English option and "切换至中文" for the Chinese option in the dropdown menu

## Error Handling _(mandatory)_

- **Invalid Locale URLs**: When manually navigating to a non-supported locale prefix (e.g., `/fr/page`), display the not found page
