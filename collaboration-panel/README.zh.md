# dsh-osc-collaboration-panel

[English](README.md) | 中文

功能：按 role.repoList 拉取当前用户相关的 open issues / review-requested PRs，供侧边栏协作看板展示。

包名：`@ruyiAi/dsh-osc-collaboration-panel`

依赖：role, webServer

依赖的config.yaml配置：无

### 可调用Tools

无

### 注册的 Web API：

1. GET `/integrations/collaboration-panel/items`：列出看板条目。

2. GET `/integrations/collaboration-panel/items/<owner%2Fname>/<number>`：条目详情。

### 维护的 Service 状态

无
