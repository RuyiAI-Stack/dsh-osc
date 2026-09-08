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

interface GitHubBot {
  createComment(input: {
    org: string
    repo: string
    number: number
    body: string
  }): Promise<{ commentId: number; url: string; repo: string }>
}

function ctxEmit(ctx: Context, event: 'pr-chat/path', value: PathEvent): void
function ctxEmit(ctx: Context, event: 'pr-chat/sent', value: SentEvent): void
function ctxEmit(ctx: Context, event: 'pr-chat/path' | 'pr-chat/sent', value: PathEvent | SentEvent): void {
  ctx.emit(event, value as never)
}

async function sendPr(ctx: Context, target: PrTarget, body: string): Promise<PrSendResult> {
  const [org] = requireRepo(target.repo)
  requireNumber(target.number)
  const githubBot = ctx.get('githubBot') as GitHubBot | undefined
  if (githubBot === undefined) throw new Error('pr-chat: githubBot service is not available')
  const result = await githubBot.createComment({
    org,
    repo: target.repo,
    number: target.number,
    body,
  })
  return { path: 'pr', target, commentId: result.commentId, url: result.url }
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
