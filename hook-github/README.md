# dsh-osc-hook-github

[中文](README.zh.md) | English

Purpose: Accept GitHub webhooks, verify the HMAC signature, then emit `hook/github`.

Package: `@ruyiAi/dsh-osc-hook-github`

Dependencies: webServer

config.yaml: `secret`

### Tools

none

### Web APIs

1. POST `/integrations/hook-github`: Verify `X-Hub-Signature-256`, then emit `hook/github` (delivery / event / payload).

### Service state

none
