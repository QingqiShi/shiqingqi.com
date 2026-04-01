---
name: merge-dependabot
description: Automated workflow for reviewing and merging Dependabot PRs. Use when the user wants to process, review, merge, or triage Dependabot pull requests, update dependencies, or handle dependency version bumps. Also trigger when the user mentions Dependabot, dependency updates, version bumps, or asks to merge open PRs from bots.
user-invocable: true
---

# Merge Dependabot PRs

Autonomously process open Dependabot PRs one at a time. For each: verify the actual version being upgraded, review the official changelog for breaking changes, run quality checks, and — for production dependencies — sanity-test in the browser with playwright. Merge if safe, skip if uncertain, and report everything at the end.

## Pre-flight

Before processing any PRs, verify master's CI is healthy:

```bash
gh run list --branch master --limit 3 --json conclusion,name,headBranch
```

If recent CI runs are failing on master, stop and report. Merging into a broken master just adds noise.

## Phase 1: Discover

```bash
gh pr list --author "app/dependabot" --state open --json number,title,mergeable,headRefName,labels
```

Print a numbered summary of all open Dependabot PRs, then begin processing them sequentially.

## Phase 2: Process Each PR

Work through PRs **strictly one at a time, in sequence**. Never set auto-merge. Never use `@dependabot rebase`. Every rebase, push, CI wait, and merge must happen in order — only move to the next PR after the current one is fully merged (or skipped). This prevents timing races where concurrent merges and rebases conflict with each other.

### Step 1 — Checkout and rebase

Always start by checking out the branch and rebasing on master — even if GitHub says the PR is mergeable, a local rebase ensures a clean linear history:

```bash
git fetch origin <headRefName>
git checkout <headRefName>
git rebase origin/master
```

If the rebase succeeds cleanly, force-push with lease (this is safe — these are bot-owned branches):

```bash
git push --force-with-lease origin <headRefName>
```

If the rebase has conflicts:

- If the conflicts are only in the lockfile (`pnpm-lock.yaml`), resolve by accepting the incoming version and regenerating: delete the lockfile, run `pnpm install`, then `git add pnpm-lock.yaml` and `git rebase --continue`
- If there are non-lockfile conflicts that aren't straightforward to resolve, skip the PR and note the conflict details in the summary

### Step 2 — Determine actual versions from the PR diff

Dependabot does not update PR titles or descriptions after initial creation — the versions shown can be stale. Always check the real diff:

```bash
gh pr diff <number>
```

From the `package.json` changes, extract:

- The real `from` and `to` versions
- Whether the package lives in `dependencies` (production) or `devDependencies` (development)

For grouped PRs (multiple packages updated together), repeat for each package.

### Step 3 — Review the official changelog

Fetch the actual changelog — never rely on the PR description.

1. Find the source repo:

   ```bash
   npm view <package-name> repository.url
   ```

2. Fetch the changelog (try in order):
   - **GitHub Releases**: Use `WebFetch` to read the releases page and find entries between the `from` and `to` versions
   - **CHANGELOG.md**: Fetch the raw file from the repo's default branch

3. From the changelog, identify:
   - **Breaking changes** between `from` and `to`
   - **Deprecations** that might affect the codebase
   - **Migration steps** required by the upgrade
   - Whether this is a **patch**, **minor**, or **major** bump

If a changelog cannot be found and this is a major version bump, treat it as risky and skip.

### Step 4 — Install dependencies

The branch is already checked out from Step 1. Install dependencies to pick up the version changes:

```bash
pnpm install
```

### Step 5 — Address breaking changes

If the changelog identified breaking changes or required migrations:

1. Search the codebase for affected APIs, patterns, or configuration
2. If the migration is straightforward and well-documented, apply it
3. If the migration is complex, ambiguous, or could have subtle side effects — skip the PR and explain what needs to be done in the summary

### Step 6 — Run quality checks

```bash
pnpm lint:changed
pnpm format:changed
pnpm test
pnpm build
```

If a check fails:

- Read the error carefully. If it's clearly caused by the upgrade, attempt a fix based on the changelog or migration guide.
- Re-run the failing check after fixing.
- If the fix is non-trivial or uncertain, skip the PR and include the error in the summary.

### Step 7 — Sanity test production dependencies

**For dev dependencies, skip this step.** Instead, briefly note any special considerations worth calling out — for example:

- A testing framework update: "tests passing confirms compatibility"
- A build tool update: "successful build confirms compatibility"
- A local dev tool update (e.g., dev server, HMR): "consider spinning up `pnpm dev` to verify local development still works"

**For production dependencies**, the goal is to verify that user-facing behavior hasn't regressed — especially behavior that unit tests don't cover or that could differ between test and browser environments.

1. **Find usage in the codebase**: Search for imports of the package:

   ```
   Grep for: from ['"]<package-name>
   ```

2. **Map to pages and user flows**: Based on where the dependency is imported, determine which routes, components, and features could be affected.

3. **Create and print an action plan**: Before testing, output the plan — what pages to visit, what interactions to try, what to look for. Focus on:
   - Pages/components that directly consume the dependency
   - User flows that exercise its functionality
   - Visual rendering if the dependency affects UI
   - Real browser behavior that test mocks can't replicate

4. **Start the dev server** in the background:

   ```bash
   pnpm dev &
   ```

   Wait for `localhost:3000` to respond before proceeding.

5. **Execute the test plan using the `playwright-cli` skill**:
   - Open each page from the action plan
   - Take snapshots to verify pages render correctly
   - Interact with relevant UI elements (clicks, form fills, navigation)
   - Check for console errors or unexpected behavior
   - Take screenshots as evidence of successful testing

6. **Stop the dev server** when done (kill the background process).

If anything looks broken or suspicious, skip the PR and describe what was observed.

### Step 8 — Push, wait for CI, then merge

**Never use auto-merge.** Each PR must be fully merged before moving to the next one.

If you made any changes (migration fixes, lockfile regeneration, etc.), commit and push them:

```bash
git push origin <headRefName>
```

If you rebased in Step 1, force-push is needed (already covered there).

**Wait for CI to pass** on the PR branch before merging. Poll the PR's check status:

```bash
gh pr checks <number> --watch
```

If CI fails on something you didn't touch (e.g., a flaky test unrelated to the upgrade), note it and retry once. If CI fails due to the upgrade itself and the fix isn't clear, skip the PR.

**Merge** when all of the following are true:

- Changelog review showed no unaddressed breaking changes
- All local quality checks passed
- CI is green on the PR branch
- For prod deps: browser sanity testing showed no issues
- Reasonable confidence the upgrade is safe

```bash
gh pr merge <number> --squash
```

**Skip** when any of these apply:

- Breaking changes need non-trivial or uncertain migration
- Quality checks or CI fail and the fix isn't clear
- Browser sanity testing revealed problems
- Major version bump with no changelog available
- Anything feels uncertain — err on the side of caution

After processing each PR (merged or skipped), return to master and re-fetch before starting the next PR:

```bash
git checkout origin/master
git fetch origin master
```

## Phase 3: Summary

After all PRs are processed, print a clear report:

```
## Dependabot PR Summary

### Merged
- #N — package from → to (dev/prod)

### Skipped
- #N — package — reason (e.g., "major bump, needs manual migration", "rebase requested")

### Action Required
- [PRs that need human attention, with clear explanation of what to do]
```
