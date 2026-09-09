# dsh-osc-github-ci-continuation

[中文](README.zh.md) | English

Purpose: Continue a pull-request agent iteration when GitHub reports a terminal CI failure.

Package: `@ruyiAi/dsh-osc-github-ci-continuation`

Dependencies: hook-github (`hook/github` events), webhookRuntime (`@deepseek-ai/dsh-webhook`)

config.yaml: `source` (accepted hook source, default `osc-github`), `repository` (GitHub `owner/repo` to handle), `workspaces` (GitHub `owner/repo` to absolute workspace path), `agentPreset` (default `cordis`), `permissionPreset` (default `workspace-write`), `maxIterations` (default `3`).

### Behavior

1. Listens to `hook/github` events emitted by `dsh-osc-hook-github` and bridges them into the webhook runtime.

2. Normalizes completed `check_run`, `check_suite`, and `status` deliveries into CI verdicts for the configured repository.

3. For a terminal failed verdict associated with a pull request, creates a fix Session in the mapped workspace. Duplicate deliveries are ignored.

4. Limits automatic fix Sessions per pull request to `maxIterations`, then creates one escalation Session instead of retrying again.

The Session prompt includes CI details as untrusted metadata and directs the agent to inspect the current pull request and CI state before making changes.

### Registered web APIs

None

### Maintained Service state

Recent delivery IDs, CI verdicts, and per-pull-request attempt counts.
