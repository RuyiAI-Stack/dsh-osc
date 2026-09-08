import { describe, expect, it } from 'vitest'
import { authorizeZulipBody, HttpError } from '../../../src/web/libs/auth.ts'

describe('authorizeZulipBody', () => {
  it('strips token on success', () => {
    expect(authorizeZulipBody({ token: 't', text: 'hi' }, 't')).toEqual({ text: 'hi' })
  })

  it('rejects bad token', () => {
    expect(() => authorizeZulipBody({ token: 'wrong' }, 't')).toThrow(HttpError)
  })

  it('rejects bot_email mismatch when configured', () => {
    expect(() => authorizeZulipBody({ token: 't', bot_email: 'a@x' }, 't', 'b@x')).toThrow(HttpError)
  })
})
