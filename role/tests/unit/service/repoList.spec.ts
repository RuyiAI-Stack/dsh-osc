import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RepoListStore } from '../../../src/service/repoList.ts'

describe('RepoListStore', () => {
  let home: string

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  it('creates empty repos.json under DSH_HOME', () => {
    home = mkdtempSync(join(tmpdir(), 'role-rl-'))
    const store = new RepoListStore(home)
    expect(store.path).toBe(join(home, 'open-source-collaboration', 'repos.json'))
    expect(store.load()).toEqual([])
    expect(JSON.parse(readFileSync(store.path, 'utf8'))).toEqual([])
  })

  it('loads and saves owner/name refs', () => {
    home = mkdtempSync(join(tmpdir(), 'role-rl-'))
    const store = new RepoListStore(home)
    store.save(['DangoSys/buckyball'])
    expect(store.load()).toEqual(['DangoSys/buckyball'])
  })

  it('throws when file is not an array', () => {
    home = mkdtempSync(join(tmpdir(), 'role-rl-'))
    const store = new RepoListStore(home)
    writeFileSync(store.path, JSON.stringify({ repos: [] }) + '\n')
    expect(() => store.load()).toThrow(/must contain an array/)
  })

  it('throws on bad repo refs', () => {
    home = mkdtempSync(join(tmpdir(), 'role-rl-'))
    const store = new RepoListStore(home)
    writeFileSync(store.path, JSON.stringify(['../evil/x']) + '\n')
    expect(() => store.load()).toThrow(/bad repo/)
  })
})
