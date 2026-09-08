import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { defineSendToPrTool, sendToPr } from '../../../src/tools/api/send-to-pr.ts'

function makeCtx(overrides: {
  createComment?: ReturnType<typeof vi.fn>
  emit?: ReturnType<typeof vi.fn>
}): Context {
  const createComment = overrides.createComment ?? vi.fn()
  return {
    emit: overrides.emit ?? vi.fn(),
    get: (name: string) => (name === 'githubBot' ? { createComment } : undefined),
    agents: { get: vi.fn() },
    agentRuntime: { prompt: vi.fn() },
  } as unknown as Context
}

describe('pr_chat_send_to_pr', () => {
  it('registers as pr_chat_send_to_pr', () => {
    expect(defineSendToPrTool({ ctx: makeCtx({}) }).name).toBe('pr_chat_send_to_pr')
  })

  it('rejects empty body before calling GitHub', async () => {
    const createComment = vi.fn()
    await expect(
      sendToPr(makeCtx({ createComment }), { repo: 'a/b', number: 1, body: '' }),
    ).rejects.toThrow(/body is required/)
    expect(createComment).not.toHaveBeenCalled()
  })

  it('rejects bad repo', async () => {
    await expect(
      sendToPr(makeCtx({}), { repo: 'bad', number: 1, body: 'hi' }),
    ).rejects.toThrow(/owner\/name/)
  })

  it('posts comment through the GitHub App and emits events', async () => {
    const emit = vi.fn()
    const createComment = vi.fn(async () => ({
      commentId: 42,
      url: 'https://github.com/a/b/pull/1#issuecomment-42',
      repo: 'a/b',
    }))
    const ctx = makeCtx({ emit, createComment })
    await expect(sendToPr(ctx, { repo: 'a/b', number: 1, body: 'hi' })).resolves.toEqual({
      path: 'pr',
      target: { repo: 'a/b', number: 1 },
      commentId: 42,
      url: 'https://github.com/a/b/pull/1#issuecomment-42',
    })
    expect(createComment).toHaveBeenCalledWith({
      org: 'a',
      repo: 'a/b',
      number: 1,
      body: 'hi',
    })
    expect(emit).toHaveBeenCalledWith('pr-chat/path', {
      path: 'pr',
      target: { repo: 'a/b', number: 1 },
    })
    expect(emit).toHaveBeenCalledWith(
      'pr-chat/sent',
      expect.objectContaining({ path: 'pr', result: expect.objectContaining({ commentId: 42 }) }),
    )
  })

  it('propagates GitHub App failures', async () => {
    const createComment = vi.fn(async () => {
      throw new Error('github-bot: unknown org x')
    })
    await expect(
      sendToPr(makeCtx({ createComment }), { repo: 'x/y', number: 1, body: 'hi' }),
    ).rejects.toThrow(/unknown org x/)
  })
})
