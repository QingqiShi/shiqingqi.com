---
name: posthog-inbox
description: Check the PostHog inbox and query PostHog data with posthog-cli. Use when the user asks to check PostHog, the inbox, signal reports, what PostHog found, or anything about PostHog analytics, error tracking, session replay, or feature flag data.
---

# PostHog inbox

Use the globally installed `posthog-cli` (`pnpm add -g @posthog/cli` if missing). Do not use PostHog MCP tools, and do not run `posthog-cli api skill install` — this project deliberately avoids the `.agents/` skill layer.

This repo's PostHog project is **Qingqi.dev, ID `243843`, EU cloud**. Sessions inherit `POSTHOG_CLI_PROJECT_ID=243843` from the env block in `.claude/settings.json`, which overrides the machine-level login's active project. If the variable is missing from the environment, prefix each call with it. Do not call `switch-project` — it changes the machine-global default for other repos.

## Auth

Calls fail with `Missing PostHog API key` when the machine is not authenticated. Ask the user to run `! posthog-cli login` (one-time, credentials stay in the home directory). Never write PostHog credentials into the repo.

## Check the inbox

The inbox holds signal reports: clusters of related observations from error tracking, session replay, and other scouts.

```sh
posthog-cli api call inbox-reports-list '{"status": "ready,pending_input"}'
posthog-cli api call inbox-reports-list '{"status": "ready"}'
```

`status` takes a comma-separated list; without it the API returns every status except `suppressed`, mixing archived reports (`resolved`, `failed`) and in-pipeline ones (`potential`, `candidate`, `in_progress`) in with the actionable ones. `ready` is actionable now, `pending_input` waits on a human, earlier statuses are still in the pipeline, and `suppressed` (dismissed) is hidden unless `include_all_statuses` is true — that flag only dedupes against the whole inbox and is ignored once `status` is set. Filter to `ready,pending_input` for the live queue, or `ready` alone for only what can be picked up now.

Before acting on a report, read its full work log — evidence, judgments, and log entries. Reports can be stale: check `already_addressed` and verify the claimed gap against current code, project settings, and merged PRs before acting.

```sh
posthog-cli api call inbox-report-artefacts-list '{"report_id": "<report-uuid>"}'
```

## Anything else PostHog

Discover tools at runtime — never guess a schema:

```sh
posthog-cli api search <topic>
posthog-cli api info <tool>
posthog-cli api call <tool> '<json>'
```

`posthog-cli api --agent-help` prints the full agent guide. Mutating tools require `--confirm` and explicit user direction.
