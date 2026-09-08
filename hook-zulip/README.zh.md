# dsh-osc-hook-zulip

[English](README.md) | 中文

功能：接收 Zulip outgoing webhook，校验 token 后发出 `hook/zulip` 事件。

包名：`@ruyiAi/dsh-osc-hook-zulip`

依赖：webServer

依赖的config.yaml配置：`token`

### 可调用Tools

无

### 注册的 Web API：

1. POST `/integrations/hook-zulip`：校验 body.token（及可选 bot_email），成功后 emit `hook/zulip`。

### 维护的 Service 状态

无
