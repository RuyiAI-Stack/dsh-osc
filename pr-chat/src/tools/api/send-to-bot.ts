import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { send } from '../libs/send.ts'
import type { BotSendResult, SendToBotRequest } from '../libs/types.ts'
import { requireBody } from '../libs/validate.ts'

export async function sendToBot(ctx: Context, request: SendToBotRequest): Promise<BotSendResult> {
  requireBody(request.body)
  return send(ctx, {
    path: 'bot',
    target: { sessionId: request.sessionId },
    body: request.body,
  }) as Promise<BotSendResult>
}

export function defineSendToBotTool(chat: { readonly ctx: Context }) {
  return defineTool({
    name: 'pr_chat_send_to_bot',
    description: 'Send a message to a local bot session without contacting GitHub.',
    parameters: {
      sessionId: { type: 'string', required: true },
      body: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', required: true },
          target: { type: 'json', required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async args => sendToBot(chat.ctx, args as SendToBotRequest),
  })
}
