# dsh-osc-hook-zulip

[中文](README.zh.md) | English

Purpose: Accept Zulip outgoing webhooks, verify the token, then emit `hook/zulip`.

Package: `@ruyiAi/dsh-osc-hook-zulip`

Dependencies: webServer

config.yaml: `token`

### Tools

none

### Web APIs

1. POST `/integrations/hook-zulip`: Verify `body.token` (and optional `bot_email`), then emit `hook/zulip`.

### Service state

none
