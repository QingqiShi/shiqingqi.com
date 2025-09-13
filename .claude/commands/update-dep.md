---
description: Update a dependency using Dependabot PR with automated testing and merging
args:
  - name: dependency
    description: Name of the dependency to update (e.g., 'react', 'next', 'eslint')
    required: true
---

You are tasked with updating the dependency "$1" using the automated Dependabot workflow. Follow these steps:

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

1. Check if PR CI is passing:
   ```bash
   gh pr checks [PR_NUMBER]
   ```
2. If all checks pass:
   ```bash
   # Auto-merge with squash
   gh pr merge [PR_NUMBER] --squash --auto
   ```
3. If checks are failing:

   ```bash
   # Checkout locally and fix
   gh pr checkout [PR_NUMBER]
   pnpm install
   pnpm build:tsc  # Fix TypeScript errors
   pnpm lint       # Fix linting errors
   pnpm test       # Fix test failures

   # Push fixes
   git add .
   git commit -m "Fix build issues for $1 update"
   git push

   # Merge after fixes
   gh pr merge [PR_NUMBER] --squash --auto
   ```

### If Runtime Dependency:

1. Always checkout locally for testing:

   ```bash
   gh pr checkout [PR_NUMBER]
   pnpm install
   ```

2. Research the update for breaking changes:

   ```bash
   # Check what versions are being updated
   gh pr diff [PR_NUMBER] -- package.json

   # Look at PR description for changelog links
   gh pr view [PR_NUMBER]
   ```

3. Run comprehensive tests:

   ```bash
   pnpm build:tsc  # TypeScript checks
   pnpm lint       # Linting
   pnpm test       # Unit tests
   pnpm build      # Full production build
   ```

4. If tests fail, fix the issues:
   - Update code for breaking changes
   - Fix TypeScript errors without using type assertions
   - Update imports/exports if needed
   - Commit fixes with descriptive messages

5. Use hawkeye agent for visual regression testing:

   ```
   Please use the hawkeye agent to take screenshots of key pages and verify no visual regressions:
   - Homepage (/en and /zh)
   - Movie database (/en/movie-database and /zh/movie-database)
   - Search functionality
   - Navigation and responsive layouts

   Check for:
   - Visual layout issues
   - Console errors
   - Failed network requests
   - Hydration mismatches
   ```

6. Clean up test artifacts:

   ```bash
   # Remove any screenshot directories
   rm -rf .playwright-mcp/
   # Remove any other test artifacts
   ```

7. Push any fixes and merge:

   ```bash
   git add .
   git commit -m "Fix compatibility issues for $1 update"
   git push

   # Merge with squash
   gh pr merge [PR_NUMBER] --squash --auto
   ```

## 4. Final Verification

After merging, verify the update was successful:

```bash
# Switch back to main branch
git checkout master
git pull

# Verify the dependency was updated
grep "$1" package.json
```

## Error Handling

If any step fails:

- Provide clear error messages
- Suggest manual intervention steps
- Don't auto-merge if any tests are failing
- Always prefer proper fixes over type assertions or workarounds

Remember: Dev dependencies can be auto-merged if CI passes, but runtime dependencies always require local testing and visual verification.
