# dsh-osc-github-mention

[中文](README.zh.md) | English

Purpose: Turn GitHub `@mention`s of the org's App bot into automatically created agent task Sessions.

Package: `@ruyiAi/dsh-osc-github-mention`

Dependencies: hook-github (`hook/github` events), webhookRuntime (`@deepseek-ai/dsh-webhook`)

config.yaml: `source` (accepted hook source, default `osc-github`), `login` (App login to react to, default `chipcrowd`), `botLogins` (never-dispatched authors, default `chipcrowd[bot]`, `chipcrowd`), `workspaces` (GitHub `owner/repo` → absolute workspace path), `agentPreset` (default `cordis`), `permissionPreset` (default `workspace-write`).

### Behavior

1. Listens to `hook/github` events emitted by `dsh-osc-hook-github`.

2. Bridges every non-`ping`/`installation` delivery into the webhook runtime as a `github` delivery with source `config.source`.

3. A registered rule creates one root Session per delivery that mentions `@login` (or `@login[bot]`) in an opened issue, opened pull request, or newly created comment on a repository listed in `workspaces`. Activity authored by `botLogins` is ignored, and deliveries are deduplicated for one minute per repository/thread/author.

4. The Session is created in the mapped workspace with the configured agent and permission presets; its prompt names the task text and asks the agent to finish by replying on the thread through `pr_chat_send_to_pr`, using `github_bot_commit`/`github_bot_open_pull_request` for code changes.

The webhook payload is embedded only as untrusted `event_metadata_json`; the Session prompt instructs the agent to refresh live GitHub state with its tools.

### Registered web APIs

None

### Maintained Service state

None
