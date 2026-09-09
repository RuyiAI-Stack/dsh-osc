# dsh-osc-github-bot

[中文](README.zh.md) | English

Purpose: Use a configured GitHub App so the agent can commit files, push branches, open PRs, and open issues under a given org.

Package: `@ruyiAi/dsh-osc-github-bot`

Dependencies: tools

config.yaml: `orgs` (per-org `appId`, `privateKeyFile`; optional `apiBaseUrl`)

### Tools

1. github_bot_commit: Commit changes onto a branch as the GitHub App — creates the branch when it does not exist, otherwise appends a fast-forward commit to the existing branch head. A change entry carries either `content` (regular file) or `sha` (submodule gitlink, mode 160000).

2. github_bot_open_pull_request: Open a pull request for an existing head branch as the GitHub App.

3. github_bot_create_issue: Open a GitHub issue in a repository as the GitHub App.

### Web APIs

none

### Service state

none
