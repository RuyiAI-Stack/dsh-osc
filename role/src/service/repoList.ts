import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { isRepoRef } from '../tools/libs/repo-ref.ts'

export class RepoListStore {
  readonly path: string

  constructor(dshHome: string) {
    this.path = join(dshHome, 'open-source-collaboration', 'repos.json')
    mkdirSync(dirname(this.path), { recursive: true })
    if (!existsSync(this.path)) this.save([])
  }

  load(): string[] {
    const value: unknown = JSON.parse(readFileSync(this.path, 'utf8'))
    if (!Array.isArray(value)) throw new Error('role: repos file must contain an array: ' + this.path)
    for (const repo of value) {
      if (!isRepoRef(repo)) {
        throw new Error('role: bad repo ' + String(repo) + '; expected owner/name with safe path segments')
      }
    }
    return value
  }

  save(repos: string[]): void {
    writeFileSync(this.path, JSON.stringify(repos, null, 2) + '\n')
  }
}
