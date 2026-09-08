# dsh-osc-github-bot

[English](README.md) | 中文

功能：用配置好的 GitHub App，让 agent 在指定 org 下提交文件、推分支、开 PR 并创建 issue。

包名：`@ruyiAi/dsh-osc-github-bot`

依赖：tools

依赖的config.yaml配置：`orgs`（各 org 的 `appId`、`privateKeyFile`；可选 `apiBaseUrl`）

### 可调用Tools

1. github_bot_commit：使用 GitHub App 身份在仓库新建分支并提交文件。

2. github_bot_open_pull_request：使用 GitHub App 身份对已有 head 分支开 Pull Request。

3. github_bot_create_issue：使用 GitHub App 身份在仓库中创建 issue。

### 注册的 Web API：

无

### 维护的 Service 状态

无
