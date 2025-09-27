---
description: Validate a Dependabot PR with automated testing and merge if validated.
args:
  - name: dependency
    description: Name of the dependency to update (e.g., 'react', 'next', 'eslint')
    required: true
---

**IMPORTANT**: Use the TodoWrite tool to create a detailed todo list tracking each step of the validation process.

Follow these steps to validate the given dependency.

## 1. Find Dependabot PR

First, find the relevant Dependabot PR that updates "$1":

```bash
# List all open Dependabot PRs
gh pr list --author "app/dependabot" --json number,title,state,headRefName,isDraft --limit 20
```

Look for:

- Exact match: PR title containing "$1"
- Group match: PR title mentioning a group that contains "$1" (e.g., "the react group", "the eslint group")
- Partial match: PR updating a package with "$1" in the name

## 2. Determine Dependency Type

Check if "$1" is a dev dependency or runtime dependency by examining package.json:

```bash
# Check if it's in dependencies (runtime)
grep -A 50 '"dependencies"' package.json | grep "$1"

# Check if it's in devDependencies (dev)
grep -A 50 '"devDependencies"' package.json | grep "$1"
```

## 3. Handle Based on Dependency Type

### If Dev Dependency:

We can rely on CI checks.

```bash
gh pr checks [PR_NUMBER]
# If all checks pass:
gh pr merge [PR_NUMBER] --squash --auto
```

If there are failing CI checks:

1. Check out the PR locally and run `pnpm install`.
2. Use the PR description combined with doc-reader to understand breaking changes and migration steps.
3. Use refactoring-agent to make systematic refactoring to fix the breaking changes.
4. Re-run the CI checks locally to verify the fix worked; iterate step 2 until all checks pass.
5. Commit and push the changes, then set auto-merge with squash.

### If Runtime Dependency:

1. First, follow dev dependency instructions to ensure static checks are all passing.
2. Check out the PR locally if you haven't already, and after checked out, run `pnpm install`.
3. Start the local dev server in the background with `pnpm dev` (then sleep for 30s).
4. **Verify local server is running**: Check that the dev server started successfully on port 3000 by testing `curl -f http://localhost:3000` or similar. If the port is taken, use `fuser -k 3000/tcp` to kill the process using the port and restart the local dev server.
5. **CRITICAL**: Run each playwright task sequentially (never in parallel). For each screenshot task, use descriptive filenames with the pattern `[step]-[prod/local]-[page].png`. Use the playwright-agent individually for each task with retry logic (up to 3 attempts per task):

5a. Take a screenshot of https://qingqi.dev → save as `5a-prod-homepage.png`
5b. Take a screenshot of http://localhost:3000 → save as `5b-local-homepage.png`
5c. Take a screenshot of https://qingqi.dev/experiences/citadel → save as `5c-prod-citadel.png`
5d. Take a screenshot of http://localhost:3000/experiences/citadel → save as `5d-local-citadel.png`
5e. Take a screenshot of https://qingqi.dev/movie-database → save as `5e-prod-movies.png`
5f. Take a screenshot of http://localhost:3000/movie-database → save as `5f-local-movies.png`
5g. Take a screenshot of https://qingqi.dev/movie-database?type=tv&genre=10759 → save as `5g-prod-tvshows.png`
5h. Take a screenshot of http://localhost:3000/movie-database?type=tv&genre=10759 → save as `5h-local-tvshows.png`
5i. Take a screenshot of https://qingqi.dev/movie-database/movie/617126 → save as `5i-prod-moviedetail.png`
5j. Take a screenshot of http://localhost:3000/movie-database/movie/617126 → save as `5j-local-moviedetail.png`
5k. Open https://qingqi.dev, click the toggle "Switch to dark theme" (or light mode), then take a screenshot → save as `5k-prod-darkmode.png`
5l. Open http://localhost:3000, click the toggle "Switch to dark theme" (or light mode), then take a screenshot → save as `5l-local-darkmode.png`
5m. Open https://qingqi.dev, click the button "Languages", then click "中文", then take a screenshot → save as `5m-prod-chinese.png`
5n. Open http://localhost:3000, click the button "Languages", then click "中文", then take a screenshot → save as `5n-local-chinese.png`

6. **Compare screenshots using playwright-agent**: For each pair, use the playwright-agent to perform visual comparison between:

- `5a-prod-homepage.png` and `5b-local-homepage.png`
- `5c-prod-citadel.png` and `5d-local-citadel.png`
- `5e-prod-movies.png` and `5f-local-movies.png`
- `5g-prod-tvshows.png` and `5h-local-tvshows.png`
- `5i-prod-moviedetail.png` and `5j-local-moviedetail.png`
- `5k-prod-darkmode.png` and `5l-local-darkmode.png`
- `5m-prod-chinese.png` and `5n-local-chinese.png`

**Visual Diff Failure Handling**: If any visual comparison shows significant differences:
- Document the specific differences found
- Analyze whether the differences are:
  - Expected (e.g., timestamp differences, dynamic content)
  - Regression issues that need fixing
  - Acceptable changes due to the dependency update
- If regressions are found, create a detailed plan to fix them before proceeding
- Only proceed with merge if all differences are acceptable or fixed

7. **Navigation User Flow Testing**: Use playwright-agent with retry logic (up to 3 attempts) to run through the following navigation user flow sequentially:

- Open the home page (http://localhost:3000)
- Click on the link with label "Citadel August 2021 to now, click to view details"
- Expect the text "At Citadel, I work as a software engineer" to be on the screen
- Click on the link with label "Back"
- Expect to be back on the home page
- Click on the "Movie database" card
- Click on "TV Shows"
- Expect the URL search param `?type=tv` to be added

**CRITICAL REMINDERS**:
- Kill the background task (`pnpm dev`) when done
- Clean up all the screenshots after testing is complete

**Success Path**: If all Playwright tests pass and visual comparisons are acceptable, set auto-merge with squash: `gh pr merge [PR_NUMBER] --squash --auto`

**Failure Handling**: If any Playwright tests fail or visual differences are concerning:
1. Document specific failures or visual regressions found
2. Analyze root cause (dependency breaking change, environment issue, etc.)
3. Propose a detailed remediation plan with specific steps
4. Wait for user confirmation before proceeding with fixes
5. Do NOT merge until all issues are resolved
