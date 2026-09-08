import { describe, expect, it } from 'vitest'
import {
  candidateFrom,
  isMentioned,
  mentionPattern,
  renderTaskPrompt,
  renderTaskTitle,
  type MentionPolicy,
} from '../../src/logic.ts'

const policy: MentionPolicy = {
  login: 'chipcrowd',
  botLogins: ['chipcrowd[bot]', 'chipcrowd'],
  workspaces: { 'DangoSys/buckyball': '/workspace/buckyball' },
}

function commentPayload(body: string, author: string, repo = 'DangoSys/buckyball') {
  return {
    action: 'created',
    issue: { number: 42, title: 't', html_url: 'https://github.com/DangoSys/buckyball/issues/42' },
    comment: {
      body,
      user: { login: author },
      html_url: 'https://github.com/DangoSys/buckyball/issues/42#issuecomment-1',
    },
    repository: { full_name: repo },
  }
}

describe('mentionPattern', () => {
  it('matches plain and [bot] forms case-insensitively', () => {
    expect(mentionPattern('chipcrowd').test('@chipcrowd hello')).toBe(true)
    expect(mentionPattern('chipcrowd').test('hi @chipcrowd[bot]')).toBe(true)
    expect(mentionPattern('chipcrowd').test('@ChipCrowd')).toBe(true)
    expect(mentionPattern('chipcrowd').test('@chipcrowd2')).toBe(false)
    expect(mentionPattern('chipcrowd').test('no mention')).toBe(false)
  })

  it('isMentioned follows the same grammar', () => {
    expect(isMentioned('please @chipcrowd fix it', 'chipcrowd')).toBe(true)
    expect(isMentioned('please @chipcrowd[bot] fix it', 'chipcrowd')).toBe(true)
    expect(isMentioned('no one here', 'chipcrowd')).toBe(false)
  })
})

describe('candidateFrom', () => {
  it('extracts an issue_comment mention', () => {
    const c = candidateFrom('issue_comment', commentPayload('@chipcrowd look at this', 'alice'), policy)
    expect(c).not.toBeNull()
    expect(c).toMatchObject({
      repo: 'DangoSys/buckyball',
      kind: 'comment',
      number: 42,
      author: 'alice',
    })
  })

  it('extracts an opened issue mention', () => {
    const payload = {
      action: 'opened',
      issue: {
        number: 7,
        body: '@chipcrowd please triage',
        user: { login: 'bob' },
        html_url: 'https://github.com/DangoSys/buckyball/issues/7',
      },
      repository: { full_name: 'DangoSys/buckyball' },
    }
    const c = candidateFrom('issues', payload, policy)
    expect(c).toMatchObject({ kind: 'issue', number: 7, author: 'bob' })
  })

  it('extracts an opened pull_request mention', () => {
    const payload = {
      action: 'opened',
      pull_request: {
        number: 9,
        body: 'fixes things @chipcrowd',
        user: { login: 'carol' },
        html_url: 'https://github.com/DangoSys/buckyball/pull/9',
      },
      repository: { full_name: 'DangoSys/buckyball' },
    }
    const c = candidateFrom('pull_request', payload, policy)
    expect(c).toMatchObject({ kind: 'pr', number: 9, author: 'carol' })
  })

  it('ignores the bot own activity', () => {
    expect(candidateFrom('issue_comment', commentPayload('@chipcrowd hi', 'chipcrowd[bot]'), policy)).toBeNull()
  })

  it('ignores unmapped repositories', () => {
    const p = commentPayload('@chipcrowd hi', 'alice', 'other/repo')
    expect(candidateFrom('issue_comment', p, policy)).toBeNull()
  })

  it('ignores edits and non-mention bodies', () => {
    expect(candidateFrom('issue_comment', { ...commentPayload('@chipcrowd hi', 'alice'), action: 'edited' }, policy)).toBeNull()
    expect(candidateFrom('issue_comment', commentPayload('no bot here', 'alice'), policy)).toBeNull()
    expect(candidateFrom('push', commentPayload('@chipcrowd hi', 'alice'), policy)).toBeNull()
  })
})

describe('prompt rendering', () => {
  it('renders a stable task title and prompt with untrusted metadata', () => {
    const c = candidateFrom('issue_comment', commentPayload('@chipcrowd do the thing', 'alice'), policy)!
    expect(renderTaskTitle(c.repo, c.number)).toBe('ChipCrowd task DangoSys/buckyball#42')
    const prompt = renderTaskPrompt(c, 'delivery-1')
    expect(prompt).toContain('DangoSys/buckyball#42')
    expect(prompt).toContain('TASK TEXT')
    expect(prompt).toContain('event_metadata_json: ')
    expect(prompt).toContain('pr_chat_send_to_pr with repo DangoSys/buckyball and number 42')
  })
})
