import { describe, expect, it } from 'vitest'
import { isMaintainer, parsePermission } from '../../../../src/tools/libs/permissions.ts'

describe('isMaintainer', () => {
  it('accepts admin and maintain', () => {
    expect(isMaintainer('admin')).toBe(true)
    expect(isMaintainer('maintain')).toBe(true)
    expect(isMaintainer('write')).toBe(false)
    expect(isMaintainer('read')).toBe(false)
    expect(isMaintainer('')).toBe(false)
  })
})

describe('parsePermission', () => {
  it('reads permission string', () => {
    expect(parsePermission({ permission: 'admin' })).toBe('admin')
  })

  it('throws on bad body', () => {
    expect(() => parsePermission(null)).toThrow(/not an object/)
    expect(() => parsePermission({})).toThrow(/permission field missing/)
    expect(() => parsePermission({ permission: '' })).toThrow(/permission field missing/)
  })
})
