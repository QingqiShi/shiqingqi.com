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
3. **Run comprehensive E2E tests**: Execute `pnpm test:e2e` which automatically:
   - Starts the dev server
   - Runs all Playwright tests covering:
     - Homepage portfolio with all sections (Projects, Experiences, Education)
     - Navigation flows between pages
     - Language toggle (English ↔ Chinese) with persistence
     - Theme toggle (light ↔ dark) with system preference detection and persistence
     - Movie/TV browsing with filters, sorting, and infinite scroll
     - Media detail pages (movie and TV shows)
     - Experience and education detail pages
     - Browser back navigation
     - URL parameter persistence
   - Shuts down the dev server
4. **Analyze test results**:
   - If all tests pass → runtime validation complete, proceed to merge
   - If tests fail → investigate failures:
     - Check test output for specific failing assertions
     - Review error messages and stack traces
     - Determine if failures are due to:
       - Actual regressions from the dependency update
       - Breaking changes requiring code updates
       - Flaky tests (re-run once to confirm)
     - If actual regressions: create a detailed fix plan and implement before merging
     - If breaking changes: use doc-reader and refactoring-agent to apply migrations

**Success Path**: If all E2E tests pass, set auto-merge with squash: `gh pr merge [PR_NUMBER] --squash --auto`

**Failure Handling**: If E2E tests fail:

1. Document specific test failures and error messages
2. Analyze root cause (dependency breaking change, test environment issue, etc.)
3. Propose a detailed remediation plan with specific steps
4. Wait for user confirmation before proceeding with fixes
5. Do NOT merge until all issues are resolved
