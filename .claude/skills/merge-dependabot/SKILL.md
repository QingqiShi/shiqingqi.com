---
name: merge-dependabot
description: Automated workflow for reviewing and merging Dependabot PRs. Use when the user wants to process, review, merge, or triage Dependabot pull requests, update dependencies, or handle dependency version bumps. Also trigger when the user mentions Dependabot, dependency updates, version bumps, or asks to merge open PRs from bots.
user-invocable: true
---

# Merge Dependabot PRs

Autonomously process open Dependabot PRs one at a time. For each: verify the actual version being upgraded, review the official changelog for breaking changes, run quality checks, and — for production dependencies — sanity-test in the browser with playwright. Merge if safe, skip if uncertain, and report everything at the end.

## Phase 1: Discover

First verify master's CI is healthy (`gh run list --branch master --limit 3 --json conclusion,name,headBranch`). If recent runs are failing, stop and report.

Then list open Dependabot PRs:

```bash
gh pr list --author "app/dependabot" --state open --json number,title,mergeable,headRefName,labels
```

Print a numbered summary, then process them **strictly one at a time, in sequence**. Never set auto-merge. Never use `@dependabot rebase`. Only move to the next PR after the current one is fully merged or skipped.

## Phase 2: Process Each PR

### Step 1 — Checkout and rebase

```bash
git fetch origin <headRefName>
git checkout <headRefName>
git rebase origin/master
git push --force-with-lease origin <headRefName>
```

Force-push is safe — these are bot-owned branches. If the force-push fails with "stale info", Dependabot auto-rebased the branch. Delete the local branch, re-fetch, and restart this PR.

If the rebase has lockfile conflicts: delete `pnpm-lock.yaml`, run `pnpm install`, stage and continue. For non-lockfile conflicts that aren't straightforward, skip the PR.

### Step 2 — Understand the change

PR titles can be stale. Always check `gh pr diff <number>` for the real `from`/`to` versions and whether the package is in `dependencies` (prod) or `devDependencies` (dev).

Review the official changelog (find the repo via `pnpm info <package> repository.url`, then check GitHub Releases or CHANGELOG.md). Identify breaking changes, deprecations, and migration steps. If no changelog exists for a major bump, skip the PR.

### Step 3 — Verify it works

```bash
CI=true pnpm install
```

If the changelog identified breaking changes, search the codebase for affected code and apply straightforward migrations. Skip the PR if migration is complex or uncertain.

```bash
pnpm lint:changed
pnpm format:changed
pnpm test
pnpm build
```

If a check fails due to the upgrade, attempt a fix. If the fix isn't clear, skip the PR.

### Step 4 — Sanity test production dependencies

**Skip for dev dependencies** — passing checks already confirm compatibility.

**For production dependencies**, use `playwright-cli` to verify the upgraded package's code paths actually execute:

1. Search the codebase for imports of the package to identify affected features and pages
2. Start `pnpm dev` in the background
3. Visit affected pages AND exercise the specific functionality that invokes the upgraded package. Loading a page is not enough — you must trigger the code path that imports and runs the package. For example:
   - **ai-sdk / @ai-sdk/\***: Send a message in the AI chat and verify a streamed response appears
   - **react / react-dom**: Interact with stateful components (click buttons, toggle UI, submit forms)
   - **@tanstack/react-query**: Navigate to a page that fetches data and verify the data loads
   - For other packages: grep for imports, understand what the code does, and interact with that feature
4. Check for console errors after exercising the functionality
5. Take screenshots as evidence
6. Stop the dev server

Skip the PR if the package's functionality cannot be exercised (e.g., requires credentials not available locally) or if anything looks broken.

### Step 5 — Push, wait for CI, merge

Commit and push any changes made during the process. Wait for CI:

```bash
gh pr checks <number> --watch
```

Then merge:

```bash
gh pr merge <number> --squash
```

If merge is blocked by branch protection due to a check that is also failing on master (e.g., flaky test), use `--admin`. If CI fails due to the upgrade and the fix isn't clear, skip the PR.

After each PR (merged or skipped), return to master:

```bash
git checkout origin/master
git fetch origin master
```

## Phase 3: Summary

```
## Dependabot PR Summary

### Merged
- #N — package from → to (dev/prod)

### Skipped
- #N — package — reason

### Action Required
- [PRs needing human attention, with explanation]
```

## Phase 4: Self-Improvement

After every batch, reflect: **did anything require manual intervention or wasted work that could be prevented next time?** If yes, edit the workflow steps in this file or infrastructure files (`.github/dependabot.yml`, etc.) directly.

Add a `### Process Improvements` section to the summary report listing any changes made.
