/**
 * Send agent messages to a PR comment thread or bot session.
 * @module dsh-osc-pr-chat
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { defineSendToBotTool } from './tools/api/send-to-bot.ts'
import { defineSendToPrTool } from './tools/api/send-to-pr.ts'
import type { PathEvent, SentEvent } from './tools/libs/types.ts'

export type {
  BotSendResult,
  BotTarget,
  Path,
  PathEvent,
  PrSendResult,
  PrTarget,
  SendRequest,
  SendResult,
  SendToBotRequest,
  SendToPrRequest,
  SentEvent,
} from './tools/libs/types.ts'
export { send } from './tools/libs/send.ts'
export { sendToBot } from './tools/api/send-to-bot.ts'
export { sendToPr } from './tools/api/send-to-pr.ts'
export {
  requireBody,
  requireNumber,
  requirePath,
  requireRepo,
  requireSessionId,
} from './tools/libs/validate.ts'

interface Role {
  githubJson(path: string, init?: RequestInit): Promise<unknown>
}

interface Agents {
  get(id: string): { readonly id: string } | undefined
}

interface AgentRuntime {
  prompt(
    agent: { readonly id: string },
    prompt: readonly [{ readonly type: 'text'; readonly text: string }],
  ): Promise<void>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    role: Role
    agents: Agents
    agentRuntime: AgentRuntime
    prChat: PrChat
  }

  interface Events {
    'pr-chat/path': (event: PathEvent) => void
    'pr-chat/sent': (event: SentEvent) => void
  }
}

export default class PrChat extends Service {
  static inject = ['role', 'agents', 'agentRuntime', 'tools']

  constructor(ctx: Context) {
    super(ctx, 'prChat')
    ctx.tools.register(defineSendToPrTool(this))
    ctx.tools.register(defineSendToBotTool(this))
  }
}
