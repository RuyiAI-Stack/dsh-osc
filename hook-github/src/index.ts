/**
 * Receive GitHub webhooks, verify HMAC, emit hook/github.
 * @module dsh-osc-hook-github
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { Config, PATH } from './config.ts'
import { handleWebhook, type HookEvent } from './web/api/webhook.ts'
import { HttpError } from './web/libs/signature.ts'

export type { Config } from './config.ts'
export type { HookEvent } from './web/api/webhook.ts'
export { HttpError, verifyGithubSignature } from './web/libs/signature.ts'

declare module '@deepseek-ai/cordis' {
  interface Events {
    'hook/github': (event: HookEvent) => void
  }
}

export default class HookGithub extends Service {
  static inject = ['webServer']
  static Config = Config

  declare readonly config: Config

  constructor(ctx: Context, config: Config) {
    super(ctx, 'hookGithub')
    this.config = config

    ctx.effect(
      () =>
        ctx.webServer.register({
          kind: 'prefix',
          path: PATH,
          handler: async (req, res) => {
            try {
              await handleWebhook(ctx, this.config, req, res)
            } catch (err) {
              if (!(err instanceof HttpError)) throw err
              res.writeHead(err.status)
              res.end(err.message)
            }
          },
        }),
      'hook-github: api',
    )
  }
}
