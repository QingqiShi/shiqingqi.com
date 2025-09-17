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
   ```

   For systematic fixes across multiple files, use refactoring-agent:

   ```
   Use refactoring-agent to fix build issues systematically:
   - Update all files with same pattern of TypeScript errors
   - Apply consistent lint fixes across the codebase
   - Update test files with same breaking changes

   Focus on monotonic transformations that need identical fixes.
   ```

   ```bash
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

   If PR description lacks migration information, use library-expert agent:

   ```
   Use library-expert agent to research breaking changes for "$1" update:
   - What are the breaking changes between version X and version Y?
   - What migration steps are required for this update?
   - Are there any known compatibility issues with our stack?

   Focus on actionable migration guidance, not general library information.
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

   For systematic changes across multiple files (import updates, API changes), use refactoring-agent:

   ```
   Use refactoring-agent for monotonic updates required by "$1":
   - Update all import statements from old API to new API
   - Replace deprecated method calls with new equivalents
   - Update type definitions that changed in the new version

   Apply identical patterns across all affected files systematically.
   ```

5. Visual regression testing:

   Start the dev server in background mode and track its process ID:

   ```bash
   # Start dev server in background and save PID
   pnpm dev &
   DEV_PID=$!

   # Wait for server to be ready
   sleep 15
   ```

   Note: Next.js will automatically use port 3001 if port 3000 is blocked. Check the console output to see which port it's using.

   Use hawkeye agent to compare BEFORE (production) vs AFTER (PR branch):

   ```
   Use hawkeye agent to compare visual differences:
   - Compare production site vs local dev server
   - Test key pages: homepage (/en, /zh), movie database, search
   - Focus on layout changes, broken styling, responsive issues

   Provide both URLs to hawkeye for proper comparison:
   - Production: https://shiqingqi.com
   - Local: http://localhost:3000 (or :3001 if port conflict occurred)
   ```

   Alternatively, use bug-validator for single-environment UI validation:

   ```
   Use bug-validator to validate UI functionality:
   - Test core user flows (navigation, search, responsive layout)
   - Check for console errors and network failures
   - Verify no hydration mismatches or layout breaks
   - Use URL: http://localhost:3000 (or :3001 if port conflict occurred)
   ```

   After visual testing is complete, kill the dev server:

   ```bash
   # Kill the dev server process we started
   kill $DEV_PID 2>/dev/null || true
   ```

   If Next.js reported that port 3000 was in use and automatically switched to 3001, you should also kill whatever process is blocking port 3000 to prevent future conflicts:

   ```bash
   # Only run this if Next.js complained about port 3000
   lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
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
