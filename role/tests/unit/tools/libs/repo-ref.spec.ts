import { describe, expect, it } from 'vitest'
import { isRepoRef } from '../../../../src/tools/libs/repo-ref.ts'

describe('isRepoRef', () => {
  it('accepts owner/repo', () => {
    expect(isRepoRef('DangoSys/buckyball')).toBe(true)
  })

  it('rejects path traversal and bad shapes', () => {
    expect(isRepoRef('../x/y')).toBe(false)
    expect(isRepoRef('onlyone')).toBe(false)
    expect(isRepoRef('a/b/c')).toBe(false)
    expect(isRepoRef('a/.')).toBe(false)
    expect(isRepoRef('a/..')).toBe(false)
    expect(isRepoRef(1)).toBe(false)
  })

  it('accepts dots underscores and dashes', () => {
    expect(isRepoRef('org/repo.name')).toBe(true)
    expect(isRepoRef('org/repo_name')).toBe(true)
    expect(isRepoRef('org/repo-name')).toBe(true)
  })
})
