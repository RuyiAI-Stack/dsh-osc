import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { defineSendToBotTool, sendToBot } from '../../../src/tools/api/send-to-bot.ts'

function makeCtx(overrides: {
  get?: ReturnType<typeof vi.fn>
  prompt?: ReturnType<typeof vi.fn>
  emit?: ReturnType<typeof vi.fn>
}): Context {
  return {
    emit: overrides.emit ?? vi.fn(),
    role: { githubJson: vi.fn() },
    agents: { get: overrides.get ?? vi.fn() },
    agentRuntime: { prompt: overrides.prompt ?? vi.fn() },
  } as unknown as Context
}

describe('pr_chat_send_to_bot', () => {
  it('registers as pr_chat_send_to_bot', () => {
    expect(defineSendToBotTool({ ctx: makeCtx({}) }).name).toBe('pr_chat_send_to_bot')
  })

  it('rejects empty body before prompting', async () => {
    const prompt = vi.fn()
    await expect(
      sendToBot(makeCtx({ prompt }), { sessionId: 's1', body: '' }),
    ).rejects.toThrow(/body is required/)
    expect(prompt).not.toHaveBeenCalled()
  })

  it('rejects empty sessionId', async () => {
    await expect(
      sendToBot(makeCtx({}), { sessionId: '', body: 'hi' }),
    ).rejects.toThrow(/sessionId/)
  })

  it('throws when session is not live', async () => {
    const get = vi.fn(() => undefined)
    await expect(
      sendToBot(makeCtx({ get }), { sessionId: 's1', body: 'hi' }),
    ).rejects.toThrow(/not live/)
  })

  it('prompts agent and emits events', async () => {
    const agent = { id: 's1' }
    const get = vi.fn(() => agent)
    const prompt = vi.fn(async () => undefined)
    const emit = vi.fn()
    const ctx = makeCtx({ get, prompt, emit })
    await expect(sendToBot(ctx, { sessionId: 's1', body: 'hi' })).resolves.toEqual({
      path: 'bot',
      target: { sessionId: 's1' },
    })
    expect(prompt).toHaveBeenCalledWith(agent, [{ type: 'text', text: 'hi' }])
    expect(emit).toHaveBeenCalledWith('pr-chat/path', {
      path: 'bot',
      target: { sessionId: 's1' },
    })
    expect(emit).toHaveBeenCalledWith(
      'pr-chat/sent',
      expect.objectContaining({ path: 'bot', result: { path: 'bot', target: { sessionId: 's1' } } }),
    )
  })
})
