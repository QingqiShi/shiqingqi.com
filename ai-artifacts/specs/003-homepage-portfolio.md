# Feature Specification: Homepage Portfolio Display

**Created**: 2025-09-30

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a website visitor, I want to view Shi Qingqi's professional profile on the homepage so that I can quickly understand his background and see his project portfolio, professional experience, and educational history in a visually organized way.

### Acceptance Scenarios

1. **Given** a user visits the homepage for the first time, **When** the page loads, **Then** they should see a headline introducing Shi Qingqi, a brief biography, and three distinct sections (Projects, Experiences, Education)
2. **Given** a user is viewing the Projects section, **When** they see the project cards, **Then** each card should display an icon, project name, and description
3. **Given** a user sees an Experience card, **When** they view it, **Then** the card should display the company logo, employment dates, and be clickable to view more details
4. **Given** a user sees an Education card, **When** they view it, **Then** the card should display the institution logo, degree name, and dates attended
5. **Given** a user clicks on any project, experience, or education card, **When** the navigation completes, **Then** they should be taken to a detailed page about that item (if available)
6. **Given** a user is on a mobile device, **When** they view the homepage, **Then** cards should stack vertically in a single column
7. **Given** a user is on a tablet or desktop, **When** they view the homepage, **Then** cards should display in a responsive grid (2-4 columns depending on screen size)

### Edge Cases

- When a user has very long text in the biography, the layout should remain readable without breaking
- For users with JavaScript disabled, all content should still be visible and cards should remain clickable as standard links
- Cards should maintain proper aspect ratios and spacing across all device sizes
- Animated background lines should not interfere with text readability

## Requirements _(mandatory)_

### Functional Requirements

#### Content Display

- **FR-001**: System MUST display a two-line headline introducing Shi Qingqi prominently at the top of the page
- **FR-002**: System MUST display a brief biography paragraph below the headline
- **FR-003**: System MUST organize content into three distinct sections: Projects, Experiences, and Education
- **FR-004**: System MUST display section titles for each content area with clear visual hierarchy

#### Project Section

- **FR-005**: System MUST display project cards with an icon, name, and description
- **FR-006**: System MUST make project cards clickable, navigating to the project page or section
- **FR-007**: Projects section MUST include the Movie Database project as a primary showcase item
- **FR-008**: Movie Database card MUST be visually distinguished with brand-specific styling

#### Experience Section

- **FR-009**: System MUST display experience cards showing company logo, employment dates, and company name
- **FR-010**: System MUST include experience from Citadel, Spotify, and Wunderman Thompson Commerce
- **FR-011**: Experience cards MUST be clickable, navigating to detailed experience pages
- **FR-012**: Experience cards MUST display dates in a human-readable format appropriate to the user's language

#### Education Section

- **FR-013**: System MUST display education cards showing institution logo, degree/qualification name, and attendance dates
- **FR-014**: System MUST include education from University of Bristol, University of Nottingham, and Altrincham Grammar School for Boys
- **FR-015**: Education cards MUST be clickable, navigating to detailed education pages
- **FR-016**: Institution logos MUST include proper alt text for accessibility

#### Responsive Design

- **FR-017**: System MUST display cards in a single column on mobile devices (default)
- **FR-018**: System MUST display cards in a 2-column grid on small tablets
- **FR-019**: System MUST display cards in a 3-column grid on medium tablets/desktops
- **FR-020**: System MUST display cards in a 4-column grid on large desktops
- **FR-021**: System MUST maintain consistent spacing and alignment across all breakpoints

#### Visual Design

- **FR-022**: System MUST display decorative background lines that enhance visual appeal without compromising readability
- **FR-023**: System MUST use appropriate color schemes that respect the user's theme preference (light/dark)
- **FR-024**: System MUST maintain visual consistency with the overall website design language

### Key Entities

- **Project**: Represents a portfolio project with icon, name, description, and link to project details
- **Experience**: Represents professional work experience with company logo, role dates, company name, and link to detailed experience page
- **Education**: Represents educational background with institution logo, qualification name, attendance dates, and link to detailed education page
- **Section**: Represents a content grouping (Projects, Experiences, Education) with title and associated cards

## Dependencies _(mandatory)_

- **Translation System**: Existing i18n infrastructure for bilingual content display
- **Navigation**: Next.js routing for card click navigation to detail pages
- **Logo Assets**: Company and institution logos in appropriate formats (SVG, WebP)
- **Icon System**: Phosphor Icons library for project icons

## Technical Constraints _(mandatory)_

- **Browser Compatibility**: Must support all modern browsers with progressive enhancement
- **Performance**: Homepage must achieve Core Web Vitals thresholds (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- **Accessibility**: Must meet WCAG 2.1 AA standards for semantic HTML and keyboard navigation
- **SEO**: Homepage must be fully server-rendered for optimal search engine indexing

## Performance Requirements _(mandatory)_

- **Initial Page Load**: Homepage must render above-the-fold content within 1.5 seconds on 4G connections
- **Image Loading**: Logos and icons must use optimized formats (SVG for vector, WebP for raster)
- **Font Loading**: Custom fonts must not block initial render (font-display: swap or optional)
- **Animation Performance**: Background decorations must not impact scrolling performance (60fps target)

## Accessibility Requirements _(mandatory)_

- **Semantic HTML**: All content sections must use proper heading hierarchy (h1, h2) and semantic elements
- **Keyboard Navigation**: All interactive cards must be keyboard accessible with visible focus indicators
- **Screen Readers**: All logos must have descriptive alt text or ARIA labels
- **Color Contrast**: Text must maintain WCAG AA contrast ratios (4.5:1 for body text, 3:1 for large text) in both light and dark themes
- **Focus Management**: Card links must have clear focus states that work across themes

## Mobile Experience _(mandatory)_

- **Touch Targets**: All clickable cards must have minimum 44x44px touch targets
- **Responsive Images**: Logos must scale appropriately without pixelation on high-DPI screens
- **Layout Reflow**: Content must reflow gracefully without horizontal scrolling on screens down to 320px width
- **Performance**: Mobile performance budget must not exceed 100KB for critical path resources
- **Safe Areas**: Content must respect device safe areas (notches, rounded corners) on modern mobile devices
