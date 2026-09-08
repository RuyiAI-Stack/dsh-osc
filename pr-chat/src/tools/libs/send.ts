import type { Context } from '@deepseek-ai/cordis'
import type {
  BotSendResult,
  BotTarget,
  PathEvent,
  PrSendResult,
  PrTarget,
  SendRequest,
  SendResult,
  SentEvent,
} from './types.ts'
import { requireBody, requireNumber, requirePath, requireRepo, requireSessionId } from './validate.ts'

function ctxEmit(ctx: Context, event: 'pr-chat/path', value: PathEvent): void
function ctxEmit(ctx: Context, event: 'pr-chat/sent', value: SentEvent): void
function ctxEmit(ctx: Context, event: 'pr-chat/path' | 'pr-chat/sent', value: PathEvent | SentEvent): void {
  ctx.emit(event, value as never)
}

async function sendPr(ctx: Context, target: PrTarget, body: string): Promise<PrSendResult> {
  const [owner, repo] = requireRepo(target.repo)
  requireNumber(target.number)
  const response = await ctx.role.githubJson(`/repos/${owner}/${repo}/issues/${target.number}/comments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body }),
  })
  if (response === null || typeof response !== 'object')
    throw new Error('pr-chat: GitHub comment response is invalid')
  const result = response as { id?: unknown; html_url?: unknown }
  if (!Number.isSafeInteger(result.id) || typeof result.html_url !== 'string' || result.html_url.length === 0) {
    throw new Error('pr-chat: GitHub comment response is missing id or html_url')
  }
  return { path: 'pr', target, commentId: result.id as number, url: result.html_url }
}

async function sendBot(ctx: Context, target: BotTarget, body: string): Promise<BotSendResult> {
  requireSessionId(target.sessionId)
  const agent = ctx.agents.get(target.sessionId)
  if (agent === undefined) throw new Error(`pr-chat: bot session "${target.sessionId}" is not live`)
  await ctx.agentRuntime.prompt(agent, [{ type: 'text', text: body }])
  return { path: 'bot', target }
}

export async function send(ctx: Context, request: SendRequest): Promise<SendResult> {
  requirePath(request.path)
  requireBody(request.body)
  ctxEmit(ctx, 'pr-chat/path', { path: request.path, target: request.target })
  const result =
    request.path === 'pr'
      ? await sendPr(ctx, request.target, request.body)
      : await sendBot(ctx, request.target, request.body)
  ctxEmit(ctx, 'pr-chat/sent', { path: request.path, target: request.target, result })
  return result
}
