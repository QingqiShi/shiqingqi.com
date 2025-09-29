# Feature Specification: Language Toggle

**Created**: 2025-09-28

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a website visitor, I want to switch between English and Chinese languages so that I can view and interact with content in my preferred language. The system should detect my language preference from the URL or saved preference, and allow me to easily switch languages while preserving my current location and any search parameters.

### Acceptance Scenarios

1. **Given** a user visits the website with an English URL (e.g., /en/page), **When** they load the page, **Then** all content should display in English and the language toggle should show English as active
2. **Given** a user visits the website with a Chinese URL (e.g., /zh/page), **When** they load the page, **Then** all content should display in Chinese and the language toggle should show Chinese as active
3. **Given** the user sees the language selector button (translate icon), **When** they click on it, **Then** a dropdown menu should appear showing English 🇬🇧 and Chinese 🇨🇳 options with the current language highlighted
4. **Given** the user has the language dropdown open, **When** they click on the alternative language option, **Then** the page should immediately switch to that language, update the URL, and close the dropdown
5. **Given** the user switches to a different language, **When** they navigate to other pages or return later, **Then** their language preference should be remembered and maintained
6. **Given** the user is on a page with search parameters, **When** they switch languages, **Then** all search parameters should be preserved in the new language URL

### Edge Cases

- When the user visits a URL without a language prefix, the system should default to English and redirect appropriately
- For pages that don't exist in the target language, the system should maintain the language switch but show appropriate content
- The language preference should persist across browser sessions for up to 30 days
- If JavaScript is disabled, the language links should still function as standard navigation links

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST detect the current language from the URL path (e.g., /en/ or /zh/) and display content accordingly
- **FR-002**: System MUST display a language selector button with a translate icon in the header navigation
- **FR-003**: System MUST show a dropdown menu with both English and Chinese options when the language selector is clicked
- **FR-004**: System MUST visually indicate the currently active language in the dropdown menu (highlighted/disabled state)
- **FR-005**: System MUST focus on the inactive language option when the dropdown opens for keyboard accessibility
- **FR-006**: System MUST immediately switch the page language when a different language option is selected
- **FR-007**: System MUST update the URL path to reflect the new language (e.g., /en/page to /zh/page)
- **FR-008**: System MUST preserve all existing search parameters when switching languages
- **FR-009**: System MUST store the user's language preference in a cookie with 30-day expiration
- **FR-010**: System MUST refresh the page content after language switching to apply the new language
- **FR-011**: System MUST close the language dropdown after a selection is made
- **FR-012**: System MUST support both English (🇬🇧) and Chinese (🇨🇳) with appropriate flag indicators
- **FR-013**: System MUST provide proper ARIA labels for accessibility ("Switch to English", "切换至中文")
- **FR-014**: System MUST handle the dropdown closing when clicking outside or losing focus

### Key Entities

- **Locale State**: Represents the current language setting (English or Chinese) as determined by URL path and user preference, including the active language routing
- **User Preference**: Stores the user's language choice in a browser cookie for persistence across sessions and page navigation
