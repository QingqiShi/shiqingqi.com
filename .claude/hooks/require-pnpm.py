#!/usr/bin/env python3
import json
import re
import sys

HEREDOC_BODY = re.compile(
    r"<<-?\s*(['\"]?)(\w+)\1([^\n]*)\n.*?^\s*\2\s*$", re.DOTALL | re.MULTILINE
)
QUOTED_TEXT = re.compile(r"'[^']*'|\"(?:\\.|[^\"\\])*\"")
RUNS_NPM = re.compile(
    r"(?:^|[;&|(`{!]|\b(?:sudo|exec|command|time|env|xargs|then|do|else)\s)"
    r"\s*(?:\w+=\S*\s+)*(?:npm|npx)(?:\s|$)",
    re.MULTILINE,
)


def runs_npm(command: str) -> bool:
    without_heredocs = HEREDOC_BODY.sub(lambda match: match.group(3), command)
    return bool(RUNS_NPM.search(QUOTED_TEXT.sub("", without_heredocs)))


if __name__ == "__main__":
    command = json.load(sys.stdin).get("tool_input", {}).get("command", "")
    if runs_npm(command):
        print(
            "Use pnpm/pnpx instead of npm/npx. This project uses pnpm.",
            file=sys.stderr,
        )
        sys.exit(2)
