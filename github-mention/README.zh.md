# dsh-osc-github-mention

[English](README.md) | 中文

功能：把 GitHub 上对组织 App bot 的 `@提及` 自动变成新建的 agent 任务会话。

包名：`@ruyiAi/dsh-osc-github-mention`

依赖：hook-github（`hook/github` 事件）、webhookRuntime（`@deepseek-ai/dsh-webhook`）

依赖的config.yaml配置：`source`（接受的 hook 来源，默认 `osc-github`）、`login`（要响应的 App 登录名，默认 `chipcrowd`）、`botLogins`（永不派活的作者，默认 `chipcrowd[bot]`、`chipcrowd`）、`workspaces`（GitHub `owner/repo` → 工作区绝对路径）、`agentPreset`（默认 `cordis`）、`permissionPreset`（默认 `workspace-write`）。

### 行为

1. 监听 `dsh-osc-hook-github` 发出的 `hook/github` 事件。

2. 把每个非 `ping`/`installation` 的投递桥接进 webhook runtime，成为 source 为 `config.source` 的 `github` 投递。

3. 注册的规则：当一次投递在 `workspaces` 所列仓库的 opened issue、opened pull request 或新建评论中提到 `@login`（或 `@login[bot]`）时，创建一个根任务会话。`botLogins` 产生的活动被忽略；同一仓库/线程/作者一分钟内去重。

4. 会话创建在映射的工作区，使用配置的 agent preset 与 permission preset；prompt 描述任务文本，并要求 agent 完成后通过 `pr_chat_send_to_pr` 回帖、改代码时使用 `github_bot_commit`/`github_bot_open_pull_request`。

webhook payload 只作为不受信任的 `event_metadata_json` 嵌入；prompt 指示 agent 用自己的工具刷新实时 GitHub 状态。

### 注册的 Web API

无

### 维护的 Service 状态

无
