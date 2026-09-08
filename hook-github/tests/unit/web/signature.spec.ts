import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyGithubSignature } from '../../../src/web/libs/signature.ts'

describe('verifyGithubSignature', () => {
  it('accepts a matching sha256 HMAC', () => {
    const secret = Buffer.from('s3cret')
    const body = Buffer.from('{"ok":true}')
    const signature = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
    expect(verifyGithubSignature(secret, body, signature)).toBe(true)
  })

  it('rejects wrong signature and missing prefix', () => {
    const secret = Buffer.from('s3cret')
    const body = Buffer.from('{"ok":true}')
    expect(verifyGithubSignature(secret, body, 'sha256=deadbeef')).toBe(false)
    expect(verifyGithubSignature(secret, body, createHmac('sha256', secret).update(body).digest('hex'))).toBe(false)
  })
})
