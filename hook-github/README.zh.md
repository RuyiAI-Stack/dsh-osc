# dsh-osc-hook-github

[English](README.md) | 中文

功能：接收 GitHub webhook，校验 HMAC 签名后发出 `hook/github` 事件。

包名：`@ruyiAi/dsh-osc-hook-github`

依赖：webServer

依赖的config.yaml配置：`secret`

### 可调用Tools

无

### 注册的 Web API：

1. POST `/integrations/hook-github`：校验 `X-Hub-Signature-256`，成功后 emit `hook/github`（含 delivery / event / payload）。

### 维护的 Service 状态

无
