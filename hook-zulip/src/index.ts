/**
 * Receive Zulip outgoing webhooks and emit hook/zulip.
 * @module dsh-osc-hook-zulip
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import z from '@deepseek-ai/schemastery'
import { Config, PATH } from './config.ts'
import { handleWebhook } from './web/api/webhook.ts'

export type { Config } from './config.ts'
export { authorizeZulipBody, HttpError } from './web/libs/auth.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    hookZulip: HookZulip
  }

  interface Events {
    'hook/zulip'(payload: Record<string, unknown>): void
  }
}

export default class HookZulip extends Service {
  static inject = ['webServer']
  static Config: z<Config> = Config

  readonly config: Config

  constructor(ctx: Context, config: Config) {
    super(ctx, 'hookZulip')
    this.config = config

    ctx.effect(
      () =>
        ctx.webServer.register({
          kind: 'prefix',
          path: PATH,
          handler: (req, res) => void handleWebhook(ctx, this.config, req, res),
        }),
      'hook-zulip: api',
    )
  }
}
