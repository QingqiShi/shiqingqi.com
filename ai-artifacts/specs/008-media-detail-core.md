# Feature Specification: Media Detail Page Core Structure

**Status:** active
**Created:** 2025-10-04

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a user browsing the movie database, I want to view essential information about a specific movie or TV show so that I can quickly understand its title, rating, release information, runtime/episode count, genres, and plot overview.

### Acceptance Scenarios

1. **Given** a user clicks on a movie card from the browse page, **When** the detail page loads, **Then** they should see the movie's backdrop image, title, rating, release year, runtime, genres, and plot overview
2. **Given** a user clicks on a TV show card, **When** the detail page loads, **Then** they should see the show's backdrop image, title, rating, first air date year, number of seasons and episodes, genres, and plot overview
3. **Given** a movie or TV show has no backdrop image, **When** the page loads, **Then** the page should gracefully handle the missing image without breaking the layout
4. **Given** a movie has no overview text, **When** the page loads, **Then** the page should display the tagline as a fallback, or omit the description section if both are missing
5. **Given** a user is viewing the page in their preferred language, **When** the content loads, **Then** all text (title, overview, genres) should display in that language if available from TMDB
6. **Given** a user navigates to an invalid movie/TV show ID, **When** the page attempts to load, **Then** they should see a 404 page
7. **Given** a user navigates with an invalid media type, **When** the page attempts to load, **Then** they should see a 404 page

### Edge Cases

- For very short movies (< 60 minutes), display runtime appropriately (e.g., "45 minutes" not "0 hours 45 minutes")
- For TV shows with many seasons, ensure number formatting is appropriate for the user's locale
- Handle invalid movie/TV show IDs gracefully with a 404 page
- When backdrop images fail to load, ensure text remains readable against fallback background
- Handle media types other than "movie" or "tv" with 404 page

## Requirements _(mandatory)_

### Functional Requirements

#### Page Layout and Visual Design

- **FR-001**: System MUST display a backdrop image as the hero section background when available
- **FR-002**: System MUST overlay hero content on top of the backdrop with sufficient contrast for readability
- **FR-003**: System MUST display a circular rating badge showing the average rating and vote count
- **FR-004**: System MUST use a large, prominent heading (h1) for the title
- **FR-005**: System MUST display metadata on a single line separated by bullets (•): year, runtime/seasons, genres

#### Movie-Specific Display

- **FR-006**: System MUST display the movie title (prefer localized title, fallback to original_title)
- **FR-007**: System MUST display the release year extracted from release_date
- **FR-008**: System MUST display runtime formatted as "X hours Y minutes" or "Y minutes" if less than an hour
- **FR-009**: System MUST format runtime text according to the user's language (e.g., "h" vs "小时")
- **FR-010**: System MUST display movie genres as a comma-separated list in the user's language
- **FR-011**: System MUST display movie overview or tagline (prefer overview, fallback to tagline)

#### TV Show-Specific Display

- **FR-012**: System MUST display the TV show name (prefer localized name, fallback to original_name)
- **FR-013**: System MUST display the first air date year
- **FR-014**: System MUST display number of seasons and episodes formatted as "X seasons • Y episodes"
- **FR-015**: System MUST format season/episode text according to the user's language
- **FR-016**: System MUST display TV show genres as a comma-separated list in the user's language
- **FR-017**: System MUST display TV show overview or tagline (prefer overview, fallback to tagline)

#### Rating Display

- **FR-018**: System MUST display the average rating formatted to 1 decimal place
- **FR-019**: System MUST display the total vote count below the rating
- **FR-020**: System MUST use locale-appropriate number formatting (e.g., "1,234" vs "1 234")
- **FR-021**: Rating badge MUST be visually distinct and easy to read

#### Navigation and Routing

- **FR-022**: System MUST support URL pattern `/movie-database/movie/{id}` for movies
- **FR-023**: System MUST support URL pattern `/movie-database/tv/{id}` for TV shows
- **FR-024**: System MUST validate that `type` parameter is either "movie" or "tv", returning 404 otherwise
- **FR-025**: System MUST return 404 page for invalid or non-existent movie/TV show IDs
- **FR-026**: System MUST provide a back button or breadcrumb for navigation to browse page

#### Data Fetching and Performance

- **FR-027**: System MUST fetch movie/TV show details from the TMDB API in the user's preferred language
- **FR-028**: System MUST fetch TMDB configuration for image base URLs
- **FR-029**: System MUST show loading states for content that loads asynchronously

### Key Entities

- **Movie Details**: Represents comprehensive movie information including title, original_title, backdrop_path, release_date, runtime, vote_average, vote_count, genres, overview, tagline
- **TV Show Details**: Represents comprehensive TV show information including name, original_name, backdrop_path, first_air_date, number_of_seasons, number_of_episodes, vote_average, vote_count, genres, overview, tagline
- **Genre**: Represents a content category with ID and localized name

## Dependencies _(mandatory)_

- **TMDB API**: Fetches movie/TV show details
- **TMDB Configuration**: Constructs image URLs with appropriate sizes
- **Translation System**: Localizes UI labels and fetches localized TMDB content
- **Image Optimization**: Loads and displays backdrop and poster images efficiently

## Technical Constraints _(mandatory)_

- **TMDB API Rate Limits**: System must respect TMDB API rate limiting
- **Browser Compatibility**: System must support all modern browsers
- **Image Formats**: System must support TMDB's image formats (JPEG for backdrops/posters)
- **URL Structure**: System must maintain `/movie-database/[type]/[id]` pattern for SEO consistency

## Performance Requirements _(mandatory)_

- **Initial Load**: Hero section (title, rating, overview) must render within 1.5 seconds
- **Backdrop Loading**: Backdrop image must load progressively with a blur-up effect
- **Image Optimization**: Backdrop images must be appropriately sized for viewport (no loading 4K images on mobile)
- **Largest Contentful Paint**: LCP must occur within 2.5 seconds for good Core Web Vitals

## Accessibility Requirements _(mandatory)_

- **Semantic HTML**: Page must use proper heading hierarchy (h1 for title, h2 for sections)
- **Screen Readers**: Backdrop image must have descriptive alt text (movie/show title)
- **Color Contrast**: Text overlaid on backdrop must maintain sufficient contrast (may require backdrop overlay/gradient)
- **ARIA Labels**: Rating badge and interactive elements must have descriptive ARIA labels

## Error Handling _(mandatory)_

- **Invalid Media Type**: Return 404 for URLs with a type other than "movie" or "tv"
- **Invalid ID**: Return 404 for non-existent movie/TV show IDs
- **API Failures**: Display an error message if a TMDB API request fails, with a retry option
- **Missing Images**: Handle missing backdrops gracefully with a solid background or gradient
- **Malformed Data**: Handle missing or null fields gracefully with fallbacks (overview → tagline → hide section)

## Mobile Experience _(mandatory)_

- **Responsive Layout**: Hero section must adapt to mobile viewports with appropriate text sizing
- **Backdrop Images**: Must load mobile-optimized image sizes on small screens
- **Performance**: Mobile devices should load appropriately sized images (not desktop/4K versions)
- **Safe Areas**: Content must respect device safe areas (notches, rounded corners)

## Data Quality

- **Fallback Titles**: If localized title is not available, always fall back to original_title/original_name
- **Missing Overview**: If overview is missing, display tagline; if both missing, hide description section
- **Genre Localization**: Genres must be fetched in user's language from TMDB
- **Number Formatting**: All numbers (ratings, vote counts, seasons, episodes) must use locale-appropriate formatting
- **Date Formatting**: Extract year only from release_date/first_air_date to avoid timezone issues
