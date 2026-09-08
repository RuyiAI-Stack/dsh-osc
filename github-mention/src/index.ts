/**
 * Dispatch GitHub @mentions of the OSC App into webhook-created task Sessions.
 *
 * Listens for `hook/github` deliveries emitted by dsh-osc-hook-github, bridges
 * them into the @deepseek-ai/dsh-webhook runtime as `github` deliveries, and
 * answers them with one registered rule that creates a task Session whenever
 * the delivery mentions the configured App login on a mapped repository.
 * @module dsh-osc-github-mention
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { HookEvent } from '@ruyiAi/dsh-osc-hook-github'
import { Config } from './config.ts'
import type { Config as ConfigShape } from './config.ts'
import {
  candidateFrom,
  renderTaskPrompt,
  renderTaskTitle,
  type MentionCandidate,
  type MentionPolicy,
} from './logic.ts'

export { mentionPattern, isMentioned, candidateFrom, renderTaskTitle, renderTaskPrompt } from './logic.ts'
export type { MentionCandidate, MentionPolicy } from './logic.ts'
export type { Config } from './config.ts'

/** Minimal structural view of the webhook runtime consumed by this plugin. */
interface GithubDelivery {
  kind: string
  source: string
  deliveryId: string
  receivedAt: number
  event: { name: string; payload: unknown }
}

/** Session request accepted by the webhook runtime. */
interface SessionRequest {
  workspacePath: string
  title: string
  prompt: string
  agentPreset: string
  permissionPreset: string
}

interface WebhookRuleLike {
  id: string
  kind: string
  run(
    delivery: GithubDelivery,
    signal: AbortSignal,
  ): SessionRequest | null | Promise<SessionRequest | null>
}

interface WebhookRuntimeLike {
  register(rule: WebhookRuleLike): unknown
  dispatch(delivery: GithubDelivery): void
}

const RULE_ID = 'github-mention-dispatch'
const DEDUPE_MS = 60_000
const DEDUPE_MAX = 200

/** Default-exported Cordis plugin/service. */
export default class GithubMention extends Service {
  static inject = ['webhookRuntime']
  static Config = Config

  declare readonly config: ConfigShape
  private readonly recent = new Map<string, number>()

  constructor(ctx: Context, config: ConfigShape) {
    super(ctx, 'githubMention')
    this.config = config

    const runtime = ctx.get('webhookRuntime') as WebhookRuntimeLike

    const policy: MentionPolicy = {
      login: this.config.login,
      botLogins: this.config.botLogins,
      workspaces: this.config.workspaces,
    }

    ctx.effect(
      () =>
        runtime.register({
          id: RULE_ID,
          kind: 'github',
          run: (delivery, signal) => this.evaluate(policy, delivery, signal),
        }),
      'github-mention: rule',
    )

    ctx.on('hook/github', (event: HookEvent) => {
      if (event.event === 'ping' || event.event === 'installation') return
      const key = `${event.event}/${event.delivery}`
      if (this.recent.has(key)) return
      this.recent.set(key, Date.now())
      if (this.recent.size > DEDUPE_MAX) this.recent.delete(this.recent.keys().next().value)
      runtime.dispatch({
        kind: 'github',
        source: this.config.source,
        deliveryId: event.delivery,
        receivedAt: Date.now(),
        event: { name: event.event, payload: event.payload },
      })
    })
  }

  private evaluate(
    policy: MentionPolicy,
    delivery: GithubDelivery,
    signal: AbortSignal,
  ): SessionRequest | null {
    if (delivery.source !== this.config.source) return null
    const candidate: MentionCandidate | null = candidateFrom(
      delivery.event.name,
      delivery.event.payload,
      policy,
    )
    if (candidate === null) return null
    const dedupe = `${candidate.repo}#${candidate.number}@${candidate.author}`
    const now = Date.now()
    const last = this.recent.get(dedupe)
    if (last !== undefined && now - last < DEDUPE_MS) return null
    this.recent.set(dedupe, now)
    if (this.recent.size > DEDUPE_MAX) this.recent.delete(this.recent.keys().next().value)

    signal.throwIfAborted()
    return {
      workspacePath: policy.workspaces[candidate.repo],
      agentPreset: this.config.agentPreset,
      permissionPreset: this.config.permissionPreset,
      title: renderTaskTitle(candidate.repo, candidate.number),
      prompt: renderTaskPrompt(candidate, delivery.deliveryId),
    }
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    githubMention: GithubMention
  }
}
