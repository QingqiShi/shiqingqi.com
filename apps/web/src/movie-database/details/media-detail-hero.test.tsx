import { describe, expect, it } from "vitest";
import { render, screen } from "#src/testing/test-utils.tsx";
import { MediaDetailHero } from "./media-detail-hero";

// TMDB returns voteAverage=0 + voteCount=0 for titles that have never been
// rated. The old code rendered a "0" badge with aria-label
// "User rating: 0 out of 10, based on 0 votes" — a falsehood that
// misrepresented "not yet rated" as "rated zero". These tests pin the
// MediaPoster-style guard: show the badge when there's at least one vote,
// drop it entirely otherwise.
describe("MediaDetailHero rating badge", () => {
  it("does not render the rating badge when the title has no votes yet", () => {
    render(
      <MediaDetailHero
        title="Obscure Unrated Film"
        backdropPath={null}
        voteAverage={0}
        voteCount={0}
        meta="2024 • 95 min"
        description="A film nobody has rated yet."
        locale="en"
        trailer={null}
      />,
    );

    // The heading still renders — we're only dropping the rating widget.
    expect(
      screen.getByRole("heading", { name: "Obscure Unrated Film", level: 1 }),
    ).toBeInTheDocument();

    // No role="img" and, crucially, no "0 out of 10" claim anywhere —
    // neither in the visible DOM nor in any accessible name.
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByLabelText(/out of 10/)).toBeNull();
  });
});
