---
description: Create branch, commit staged files, push, and open PR
---

Analyze staged changes to infer branch name and PR title automatically. Follow these steps:

1. **Check Branch Safety**
   → If not on main/master branch: **STOP** and ask user:
   - "Stash changes and switch to main/master for clean branch?"
   - "Or stack changes on top of current branch?"
   - Wait for user decision before proceeding

2. **Stage Files and Run Quality Checks**
   → Stage all modified files using `git add`
   → Run `pnpm lint:changed` to lint staged files
   → Run `pnpm format:changed` to format staged files
   → Check for additional file changes after linting/formatting and stage them
   → If linting or formatting fails, **STOP** and warn the user

3. **Analyze Changes and Infer Names**
   → Check `git status` and `git diff` to see staged files and changes
   → Infer branch name and PR title based on the **intent** of changes, not just what files changed
   → Consider current context (conversation, project goals) to understand purpose
   → Use descriptive names that explain **why** the change was made

4. **Create Branch and Commit**
   → Create and checkout new branch with inferred name
   → Create commit with staged files using inferred commit message focusing on **intent**
   → Commit message should explain **why** the change was made, not just what was changed

5. **Push and Create PR**
   → Push branch to origin with upstream tracking
   → Create GitHub PR using `gh` CLI with inferred title
   → Include basic PR description summarizing the changes and intent
   → **IMPORTANT**: Escape backticks (`) in PR description to prevent GitHub rendering issues

6. **Return Results**
   → Provide the PR URL for easy access
   → Confirm successful completion
