import { describe, expect, it } from 'vitest'
import { issueSearchQuery, mapDetail, mapSearchItem, prSearchQuery } from '../../../../src/web/libs/board.ts'

describe('issueSearchQuery / prSearchQuery', () => {
  it('builds issue and pr search strings', () => {
    expect(issueSearchQuery('o/r', 'u')).toBe('repo:o/r is:issue is:open assignee:u')
    expect(prSearchQuery('o/r', 'u')).toBe('repo:o/r is:pr is:open review-requested:u')
  })
})

describe('mapSearchItem', () => {
  it('maps a search hit', () => {
    expect(
      mapSearchItem(
        {
          repository_url: 'https://api.github.com/repos/DangoSys/buckyball',
          number: 3,
          title: 't',
          user: { login: 'alice' },
          updated_at: '2026-01-01T00:00:00Z',
          html_url: 'https://github.com/DangoSys/buckyball/issues/3',
        },
        'issue',
      ),
    ).toEqual({
      repo: 'DangoSys/buckyball',
      kind: 'issue',
      number: 3,
      title: 't',
      author: 'alice',
      updatedAt: '2026-01-01T00:00:00Z',
      url: 'https://github.com/DangoSys/buckyball/issues/3',
    })
  })

  it('throws on bad repository_url', () => {
    expect(() => mapSearchItem({ repository_url: 'https://example.com/x' }, 'issue')).toThrow(/bad repository_url/)
  })
})

describe('mapDetail', () => {
  it('maps issue with empty reviewers and null body', () => {
    expect(
      mapDetail(
        {
          number: 1,
          title: 't',
          user: { login: 'a' },
          updated_at: 't',
          html_url: 'u',
          state: 'open',
          body: null,
          labels: [{ name: 'bug' }],
          assignees: [{ login: 'a' }],
        },
        'o/r',
        'issue',
      ),
    ).toMatchObject({ body: '', requestedReviewers: [], labels: ['bug'], assignees: ['a'] })
  })

  it('maps pr reviewers', () => {
    expect(
      mapDetail(
        {
          number: 2,
          title: 't',
          user: { login: 'a' },
          updated_at: 't',
          html_url: 'u',
          state: 'open',
          body: 'x',
          labels: [],
          assignees: [],
          requested_reviewers: [{ login: 'bob' }],
        },
        'o/r',
        'pr',
      ).requestedReviewers,
    ).toEqual(['bob'])
  })
})
