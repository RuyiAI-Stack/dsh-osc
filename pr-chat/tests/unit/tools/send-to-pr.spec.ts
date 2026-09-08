import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { defineSendToPrTool, sendToPr } from '../../../src/tools/api/send-to-pr.ts'

function makeCtx(overrides: {
  githubJson?: ReturnType<typeof vi.fn>
  emit?: ReturnType<typeof vi.fn>
}): Context {
  return {
    emit: overrides.emit ?? vi.fn(),
    role: { githubJson: overrides.githubJson ?? vi.fn() },
    agents: { get: vi.fn() },
    agentRuntime: { prompt: vi.fn() },
  } as unknown as Context
}

describe('pr_chat_send_to_pr', () => {
  it('registers as pr_chat_send_to_pr', () => {
    expect(defineSendToPrTool({ ctx: makeCtx({}) }).name).toBe('pr_chat_send_to_pr')
  })

  it('rejects empty body before calling GitHub', async () => {
    const githubJson = vi.fn()
    await expect(
      sendToPr(makeCtx({ githubJson }), { repo: 'a/b', number: 1, body: '' }),
    ).rejects.toThrow(/body is required/)
    expect(githubJson).not.toHaveBeenCalled()
  })

  it('rejects bad repo', async () => {
    await expect(
      sendToPr(makeCtx({}), { repo: 'bad', number: 1, body: 'hi' }),
    ).rejects.toThrow(/owner\/name/)
  })

  it('posts comment and emits events', async () => {
    const emit = vi.fn()
    const githubJson = vi.fn(async () => ({
      id: 42,
      html_url: 'https://github.com/a/b/pull/1#issuecomment-42',
    }))
    const ctx = makeCtx({ emit, githubJson })
    await expect(sendToPr(ctx, { repo: 'a/b', number: 1, body: 'hi' })).resolves.toEqual({
      path: 'pr',
      target: { repo: 'a/b', number: 1 },
      commentId: 42,
      url: 'https://github.com/a/b/pull/1#issuecomment-42',
    })
    expect(githubJson).toHaveBeenCalledWith('/repos/a/b/issues/1/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'hi' }),
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

  it('throws when GitHub response is invalid', async () => {
    const githubJson = vi.fn(async () => ({ id: 'x' }))
    await expect(
      sendToPr(makeCtx({ githubJson }), { repo: 'a/b', number: 1, body: 'hi' }),
    ).rejects.toThrow(/missing id or html_url/)
  })
})
