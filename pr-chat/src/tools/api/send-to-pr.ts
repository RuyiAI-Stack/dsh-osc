import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { send } from '../libs/send.ts'
import type { PrSendResult, SendToPrRequest } from '../libs/types.ts'
import { requireBody } from '../libs/validate.ts'

export async function sendToPr(ctx: Context, request: SendToPrRequest): Promise<PrSendResult> {
  requireBody(request.body)
  return send(ctx, {
    path: 'pr',
    target: { repo: request.repo, number: request.number },
    body: request.body,
  }) as Promise<PrSendResult>
}

export function defineSendToPrTool(chat: { readonly ctx: Context }) {
  return defineTool({
    name: 'pr_chat_send_to_pr',
    description: 'Send a human-authenticated comment to a GitHub pull request.',
    parameters: {
      repo: { type: 'string', required: true, description: 'Repository in owner/name form.' },
      number: { type: 'number', required: true, description: 'Pull request number.' },
      body: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', required: true },
          target: { type: 'json', required: true },
          commentId: { type: 'number', required: true },
          url: { type: 'string', required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async args => sendToPr(chat.ctx, args as SendToPrRequest),
  })
}
