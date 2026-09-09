# dsh-osc-github-ci-continuation

[English](README.md) | 中文

功能：当 GitHub 报告终态 CI 失败时，继续一次 pull request 的 agent 修复迭代。

包名：`@ruyiAi/dsh-osc-github-ci-continuation`

依赖：hook-github（`hook/github` 事件）、webhookRuntime（`@deepseek-ai/dsh-webhook`）

依赖的 config.yaml 配置：`source`（接受的 hook 来源，默认 `osc-github`）、`repository`（要处理的 GitHub `owner/repo`）、`workspaces`（GitHub `owner/repo` 到工作区绝对路径）、`agentPreset`（默认 `cordis`）、`permissionPreset`（默认 `workspace-write`）、`maxIterations`（默认 `3`）。

### 行为

1. 监听 `dsh-osc-hook-github` 发出的 `hook/github` 事件，并桥接进 webhook runtime。

2. 将已完成的 `check_run`、`check_suite` 和 `status` 投递归一化为配置仓库的 CI 结论。

3. 对关联 pull request 的终态失败结论，在映射工作区创建一个修复 Session；重复投递会被忽略。

4. 每个 pull request 的自动修复 Session 最多运行 `maxIterations` 次；达到上限后仅创建一次升级处理 Session，不再继续重试。

Session prompt 把 CI 详情作为不受信任的元数据传入，并要求 agent 在改动前检查当前 pull request 和 CI 状态。

### 注册的 Web API

无

### 维护的 Service 状态

近期投递 ID、CI 结论和每个 pull request 的尝试次数。
