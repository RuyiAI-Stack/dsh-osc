# dsh-osc-role

[中文](README.zh.md) | English

Purpose: Manage GitHub login identity and repoList, and expose authenticated GitHub APIs to other plugins.

Package: `@ruyiAi/dsh-osc-role`

Dependencies: tools, authorization, credentials, webServer

config.yaml: none

### Tools

1. role_whoami: Return the logged-in GitHub user and maintainer status for each repo in repoList.

### Web APIs

1. POST `/integrations/role/login`: SSE GitHub device-flow login.

2. GET/POST/PUT/DELETE `/integrations/role/repos`: Read/write the local repo list (repoList).

### Service state

1. ctx.role.githubJson

2. ctx.role.githubCloneUrl

3. ctx.role.login

4. ctx.role.whoami

5. ctx.role.repoList: `$DSH_HOME/open-source-collaboration/repos.json`
