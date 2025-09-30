# Feature Specification: Professional Experience and Education Detail Pages

**Created**: 2025-09-30

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a website visitor interested in learning more about Shi Qingqi's background, I want to view detailed information about his specific work experiences and educational qualifications so that I can understand his professional journey, technical skills, and academic achievements in depth.

### Acceptance Scenarios

1. **Given** a user clicks on an Experience card from the homepage, **When** the detail page loads, **Then** they should see a page header with company name, job role, employment dates, and detailed content about that experience
2. **Given** a user clicks on an Education card from the homepage, **When** the detail page loads, **Then** they should see a page header with institution name, degree/qualification, dates attended, and detailed content about that educational experience
3. **Given** a user is viewing an experience detail page, **When** they read the content, **Then** they should see information about responsibilities, technologies used, and possibly projects or achievements
4. **Given** a user is viewing an education detail page, **When** they read the content, **Then** they should see information about the degree earned, modules studied, the grade achieved, and possibly links to example projects
5. **Given** a user views a detail page header, **When** they read the type label, **Then** they should see "Experience" or "Education" appropriately localized for their language
6. **Given** an education detail page includes project links, **When** a user clicks on a link, **Then** they should be taken to the external project (e.g., GitHub repository) in a new tab
7. **Given** a user is on a detail page, **When** they want to navigate back, **Then** they should be able to use the browser back button or a visible back button on the page
8. **Given** a user switches languages while on a detail page, **When** the page reloads, **Then** all content including the header should display in the new language

### Edge Cases

- When a user accesses a detail page URL directly (not from a homepage card click), the page should load normally
- When an experience has a very long technology stack list, it should be formatted readably (without overflowing)
- When an education entry has no external project links, that section should either be omitted or handled gracefully
- When translated content is missing for a specific detail page, the system should fall back to English content or show a clear error
- Detail pages should work correctly at all viewport sizes, from mobile to desktop

## Requirements _(mandatory)_

### Functional Requirements

#### Page Structure and Header

- **FR-001**: System MUST display a consistent header component for all detail pages
- **FR-002**: Header MUST display the page type ("Experience" or "Education") with the associated organization name (e.g., "Experience - Citadel")
- **FR-003**: Header MUST display the role or qualification as the primary heading (h1) (e.g., "Software Engineer", "BSc Computer Science")
- **FR-004**: Header MUST display the date range (e.g., "2022 - 2023", "2019 - 2022")
- **FR-005**: System MUST use semantic HTML with proper heading hierarchy (h2 for type/organization, h1 for role)

#### Experience Detail Pages

- **FR-006**: System MUST provide individual detail pages for each professional experience (Citadel, Spotify, Wunderman Thompson Commerce)
- **FR-007**: Experience pages MUST display job responsibilities or role description
- **FR-008**: Experience pages MUST display technologies and tools used in that role
- **FR-009**: Technology stack MUST be displayed as a formatted list (bullet points or similar)
- **FR-010**: Experience pages MAY include additional sections like achievements, projects, or impact (not currently implemented but can be added per experience)
- **FR-011**: All experience content MUST be localized based on user's language preference

#### Education Detail Pages

- **FR-012**: System MUST provide individual detail pages for each educational institution (University of Bristol, University of Nottingham, Altrincham Grammar School for Boys)
- **FR-013**: Education pages MUST display the degree or qualification earned
- **FR-014**: Education pages MUST display the grade or classification achieved
- **FR-015**: Education pages MUST display modules or courses studied
- **FR-016**: Module lists MUST be displayed as formatted lists (bullet points or similar)
- **FR-017**: Education pages MAY display example projects from that period of study
- **FR-018**: Example project links MUST open in new tabs (target="\_blank") when linking to external sites
- **FR-019**: Example project links MUST be clearly labeled with project name
- **FR-020**: All education content MUST be localized based on user's language preference

#### Navigation

- **FR-021**: System MUST provide a way to navigate back to the homepage from detail pages
- **FR-022**: System MUST support browser back button navigation
- **FR-023**: Detail page URLs MUST follow the pattern `/[locale]/experiences/{slug}` for work experiences
- **FR-024**: Detail page URLs MUST follow the pattern `/[locale]/education/{slug}` for educational institutions
- **FR-025**: URL slugs MUST be kebab-case versions of organization names (e.g., "university-of-bristol", "wunderman-thompson-commerce")

#### Content Formatting

- **FR-026**: System MUST use consistent typography and spacing for all detail pages
- **FR-027**: System MUST display lists (technology stack, modules, projects) with proper formatting and spacing
- **FR-028**: System MUST maintain readability at all viewport sizes (mobile to desktop)
- **FR-029**: System MUST apply theme-aware colors (light/dark mode support)

#### Localization

- **FR-030**: System MUST translate all UI labels (type labels, section headings, dates)
- **FR-031**: System MUST translate all content (responsibilities, modules, descriptions)
- **FR-032**: System MUST translate date labels and content, but date formats should follow a consistent human-readable style (e.g., "2022 - 2023")
- **FR-033**: System MUST maintain separate translation files for each detail page

### Key Entities

- **Experience Detail**: Represents a work experience with company name, role, dates, responsibilities, technology stack, and optional achievements or projects
- **Education Detail**: Represents an educational qualification with institution name, degree/qualification, dates, grade, modules studied, and optional example projects
- **Page Header**: Represents the consistent header component showing type, organization, role/degree, and dates
- **External Link**: Represents a hyperlink to external resources (e.g., GitHub projects) with URL and display text

## Dependencies _(mandatory)_

- **Translation System**: i18n infrastructure for bilingual content (English/Chinese)
- **Routing**: Next.js routing for nested page structure under (home)/(details)
- **Shared Components**: DetailPageTitle component for consistent headers, Anchor component for external links
- **Theme System**: Light/dark theme support via design tokens

## Technical Constraints _(mandatory)_

- **Browser Compatibility**: Must support all modern browsers with standard HTML/CSS
- **Performance**: Detail pages must be static and fast-loading (< 1 second LCP)
- **Accessibility**: Must meet WCAG 2.1 AA standards for semantic HTML and navigation
- **SEO**: Detail pages must be fully server-rendered and indexable

## Performance Requirements _(mandatory)_

- **Initial Load**: Detail pages must render within 1 second on 4G connections
- **Largest Contentful Paint**: LCP must occur within 1.5 seconds
- **Total Page Size**: Detail pages should not exceed 50KB (excluding fonts/images)
- **Time to Interactive**: TTI should be under 2 seconds

## Accessibility Requirements _(mandatory)_

- **Semantic HTML**: Must use proper heading hierarchy (h1, h2, p, ul, li, time elements)
- **Keyboard Navigation**: All links must be keyboard accessible with visible focus states
- **Screen Readers**: Header information must be properly structured for screen reader announcement
- **Time Elements**: Dates must use semantic `<time>` element with appropriate attributes
- **External Links**: External links must indicate they open in new tabs (via ARIA label or visible icon)
- **Color Contrast**: All text must meet WCAG AA contrast ratios (4.5:1 for body text) in both themes
- **Focus States**: All interactive elements must have visible focus indicators

## Error Handling _(mandatory)_

- **Invalid URL**: Return 404 for non-existent experience or education page slugs
- **Missing Translations**: Fall back to English content if translation is missing for a specific page
- **Broken External Links**: External links should use `rel="noopener noreferrer"` for security
- **Missing Content**: Handle cases where optional sections (e.g., example projects) are not present without breaking layout

## SEO Considerations _(mandatory)_

- **Server-Side Rendering**: All detail pages must be fully server-rendered for search engines
- **Meta Tags**: Each page should have unique title (e.g., "Software Engineer at Citadel - Shi Qingqi")
- **Meta Description**: Each page should have a descriptive meta description summarizing the experience/education
- **Heading Structure**: Proper h1/h2 hierarchy for SEO and semantic clarity
- **Breadcrumbs**: Consider adding breadcrumb navigation for improved SEO (not currently implemented)
- **URL Structure**: Clean, descriptive URLs that indicate content hierarchy

## Mobile Experience _(mandatory)_

- **Responsive Typography**: Font sizes must scale appropriately for mobile screens
- **Touch Targets**: All links must have adequate touch targets (44x44px minimum)
- **Readable Line Length**: Text content must maintain comfortable line length on all devices
- **Spacing**: Adequate spacing between sections and elements on small screens
- **External Links**: External links opening new tabs should work smoothly on mobile browsers
- **Safe Areas**: Content must respect device safe areas (notches, rounded corners)

## Content Management

- **Content Source**: Content is managed in translation JSON files checked into the codebase
- **Content Updates**: Updates made through direct file edits in the repository (no CMS)
- **Consistency**: All detail pages should follow consistent content structure and formatting conventions
- **Review Process**: Content changes go through standard git workflow (commit, PR, review, merge)

## Layout and Design

- **Visual Hierarchy**: Header should be visually distinct from body content
- **Typography Scale**: Use consistent typography scale across all detail pages
- **Spacing System**: Use design tokens for consistent spacing
- **Color System**: Use theme-aware color tokens for text, backgrounds, and accents
- **List Styling**: Technology stacks and module lists should be consistently styled
- **Link Styling**: External links should be visually distinct from body text
