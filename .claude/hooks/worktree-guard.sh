#!/usr/bin/env bash
#
# Pre-tool-use hook: blocks tool calls that reach outside the current worktree
# into the main repository. Only activates when running inside a worktree
# created under .claude/worktrees/.
#
set -euo pipefail

INPUT=$(cat)

# Determine current git root (worktree root when inside a worktree)
WORKTREE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

# Only activate when inside a .claude/worktrees/ directory
case "$WORKTREE_ROOT" in
  */.claude/worktrees/*) ;;
  *) exit 0 ;;
esac

# Derive the main repository root by stripping /.claude/worktrees/<name>
MAIN_REPO="${WORKTREE_ROOT%%/.claude/worktrees/*}"

TOOL=$(echo "$INPUT" | jq -r '.tool_name')

# Check whether a path escapes the worktree into the main repo
check_path() {
  local p="$1"
  [ -z "$p" ] && return 0

  # Make absolute
  [[ "$p" != /* ]] && p="$WORKTREE_ROOT/$p"

  # Normalize (resolve . and ..)
  p=$(python3 -c "import os.path, sys; print(os.path.normpath(sys.argv[1]))" "$p")

  # Block if path is under the main repo but NOT under the worktree
  if [[ "$p" == "$MAIN_REPO"* && "$p" != "$WORKTREE_ROOT"* ]]; then
    echo "Blocked: path '$p' is outside worktree '$WORKTREE_ROOT'" >&2
    exit 2
  fi
}

case "$TOOL" in
  Read|Write|Edit|MultiEdit|NotebookEdit)
    check_path "$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')"
    ;;
  Glob|Grep)
    check_path "$(echo "$INPUT" | jq -r '.tool_input.path // empty')"
    ;;
  Bash)
    CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
    # Remove worktree path references, then check if the main repo path remains
    CLEANED=$(python3 -c "import sys; print(sys.argv[1].replace(sys.argv[2], ''))" "$CMD" "$WORKTREE_ROOT")
    if echo "$CLEANED" | grep -qF "$MAIN_REPO"; then
      echo "Blocked: command references main repo '$MAIN_REPO' from within worktree" >&2
      exit 2
    fi
    ;;
esac
