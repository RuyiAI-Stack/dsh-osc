# dsh-osc-role

[English](README.md) | 中文

功能：管理 GitHub 登录身份与仓库 repoList，并向其他插件提供带用户 token 的 GitHub API。

包名：`@ruyiAi/dsh-osc-role`

依赖：tools, authorization, credentials, webServer

依赖的config.yaml配置：无

### 可调用Tools

1. role_whoami：返回当前登录的 GitHub 用户，以及 repoList 各仓库的 maintainer 状态。

### 注册的 Web API：

1. POST `/integrations/role/login`：SSE 跑 GitHub device flow 登录。

2. GET/POST/PUT/DELETE `/integrations/role/repos`：读写本地仓库名单（repoList）。

### 维护的 Service 状态

1. ctx.role.githubJson

2. ctx.role.githubCloneUrl

3. ctx.role.login

4. ctx.role.whoami

5. ctx.role.repoList：`$DSH_HOME/open-source-collaboration/repos.json`
