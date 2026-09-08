function fmtTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

function BoardCard({ item, selected, onOpen }) {
  return h('button', { type: 'button', className: `dsh-collaboration-panel-card${selected ? ' on' : ''}`, onClick: () => onOpen(item) },
    h('span', { className: 'dsh-collaboration-panel-card-title' }, item.title),
    h('span', { className: 'dsh-collaboration-panel-card-meta' },
      h('span', { className: `dsh-collaboration-panel-tag ${item.kind === 'pr' ? 'success' : 'agent'}` }, item.kind === 'pr' ? 'live' : 'issue'),
      h('span', { className: 'dsh-collaboration-panel-tag' }, `#${item.number}`),
    ),
    h('span', { className: 'dsh-collaboration-panel-card-sub' }, `${item.repo} · ${item.author} · ${fmtTime(item.updatedAt)}`),
  )
}

function BoardView({ items, selected, onOpen }) {
  const columns = [
    { key: 'issue', label: 'ISSUES', items: items.filter(item => item.kind === 'issue') },
    { key: 'pr', label: 'REVIEWS', items: items.filter(item => item.kind === 'pr') },
  ]
  return h('div', { className: 'dsh-collaboration-panel-board' }, columns.map(column => h('section', { className: 'dsh-collaboration-panel-column', key: column.key },
    h('div', { className: 'dsh-collaboration-panel-column-head' }, h('span', null, column.label), h('span', null, String(column.items.length))),
    h('div', { className: 'dsh-collaboration-panel-column-items' }, column.items.length > 0
      ? column.items.map(item => h(BoardCard, { key: `${item.repo}#${item.number}`, item, selected: selected === `${item.repo}#${item.number}`, onOpen }))
      : h('div', { className: 'dsh-collaboration-panel-empty-note' }, 'No open items.'),
    ),
  )))
}

function RepoErrors({ items }) {
  const errors = items.filter(item => item.kind === 'error')
  if (errors.length === 0) return null
  return h('div', { className: 'dsh-collaboration-panel-repo-errors' },
    errors.map(item => h('div', { key: item.repo, className: 'dsh-collaboration-panel-repo-error' },
      h('strong', null, item.repo),
      `: ${item.message}`,
    )),
  )
}

async function runLogin(onNotice) {
  const response = await fetch(LOGIN, { method: 'POST' })
  if (!response.ok || !response.body) throw new Error(await response.text())
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    for (;;) {
      const end = buffer.indexOf('\n\n')
      if (end < 0) break
      const chunk = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      let event = 'message'
      let data = ''
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      const payload = data ? JSON.parse(data) : null
      if (event === 'notice') onNotice(payload)
      if (event === 'done') return payload
      if (event === 'error') throw new Error(payload.message)
    }
  }
  throw new Error('role: login stream ended')
}
function requireRepos(repos) {
  if (!repos) throw new Error('collaboration-panel: repositories missing')
  return repos
}

function Panel() {
  const [items, setItems] = useState(null)
  const [repos, setRepos] = useState(null)
  const [repoInput, setRepoInput] = useState('')
  const [repoBusy, setRepoBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [detail, setDetail] = useState(null)
  const [selected, setSelected] = useState(null)
  const [manageRepoList, setManageRepoList] = useState(false)
  const openRowRequest = React.useRef(0)

  async function loadRepos() {
    const response = await fetch(REPOS)
    const text = await response.text()
    if (!response.ok) throw new Error(text)
    const liveRepos = JSON.parse(text)
    if (!Array.isArray(liveRepos)) throw new Error('collaboration-panel: repositories missing')
    setRepos(liveRepos)
    return liveRepos
  }

  async function refresh() {
    setError(null); setDetail(null); setSelected(null); setItems(null)
    try {
      const liveRepos = await loadRepos()
      if (liveRepos.length === 0) { setItems([]); setLoggingIn(false); return }
      const response = await fetch(API)
      const text = await response.text()
      if (response.status === 401 || text.includes('not logged in')) {
        setItems(null); setLoggingIn(true); setNotice(null)
        try {
          await runLogin(value => { setNotice(value); if (value.url) window.open(value.url, '_blank', 'noopener,noreferrer') })
          setLoggingIn(false); setNotice(null); await refresh()
        } catch (err) {
          setLoggingIn(false); setError(err instanceof Error ? err.message : String(err))
        }
        return
      }
      if (!response.ok) { setItems(null); setError(text); return }
      setItems(JSON.parse(text))
    } catch (err) {
      setRepos(null); setItems(null); setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => { void refresh() }, [])

  async function openRow(item) {
    const key = `${item.repo}#${item.number}`
    const requestId = ++openRowRequest.current
    setSelected(key)
    setDetail(null)
    try {
      const response = await fetch(`${API}/${encodeURIComponent(item.repo)}/${item.number}`)
      const text = await response.text()
      if (!response.ok) throw new Error(text)
      const nextDetail = JSON.parse(text)
      if (requestId !== openRowRequest.current) return
      setError(null)
      setDetail(nextDetail)
    } catch (err) {
      if (requestId !== openRowRequest.current) return
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function addRepo(event) {
    event.preventDefault()
    setRepoBusy(true); setError(null)
    try {
      const response = await fetch(REPOS, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ repo: repoInput.trim() }) })
      const text = await response.text()
      if (!response.ok) throw new Error(text)
      setRepoInput(''); setRepos(requireRepos(JSON.parse(text))); setManageRepoList(false); void refresh()
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setRepoBusy(false) }
  }

  async function removeRepo(repo) {
    setRepoBusy(true); setError(null)
    try {
      const response = await fetch(REPOS, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ repo }) })
      const text = await response.text()
      if (!response.ok) throw new Error(text)
      setRepos(requireRepos(JSON.parse(text)))
      void refresh()
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setRepoBusy(false) }
  }

  const boardItems = items ? items.filter(item => item.kind !== 'error') : []

  return h('div', { className: 'dsh-collaboration-panel' },
    h('div', { className: 'dsh-collaboration-panel-repoList' },
      h('span', { className: 'dsh-collaboration-panel-repoList-label' }, 'REPO LIST'),
      h('div', { className: 'dsh-collaboration-panel-repos' }, repos && repos.length > 0
        ? repos.map(repo => h('span', { className: 'dsh-collaboration-panel-repo-chip', key: repo }, repo, manageRepoList && h('button', { type: 'button', disabled: repoBusy, onClick: () => void removeRepo(repo), 'aria-label': `Remove ${repo}` }, '×')))
        : h('span', { className: 'dsh-collaboration-panel-empty-note' }, 'Add a repository to start.'),
      ),
      (manageRepoList || !repos || repos.length === 0) && h('form', { className: 'dsh-collaboration-panel-repo-form', onSubmit: addRepo }, h('input', { value: repoInput, onInput: event => setRepoInput(event.currentTarget.value), placeholder: 'owner/name', 'aria-label': 'Repository owner/name', spellCheck: false }), h('button', { type: 'submit', disabled: repoBusy, className: 'dsh-collaboration-panel-add' }, repoBusy ? 'Saving…' : 'Add')),
      repos && repos.length > 0 && h('button', { type: 'button', className: 'dsh-collaboration-panel-repoList-action', title: manageRepoList ? 'Close repoList' : 'Manage repoList', 'aria-label': manageRepoList ? 'Close repoList' : 'Manage repoList', onClick: () => setManageRepoList(!manageRepoList) }, manageRepoList ? '×' : '+'),
    ),
    error && h('div', { className: 'dsh-collaboration-panel-error' }, error),
    loggingIn && h('div', { className: 'dsh-collaboration-panel-login' }, h('p', { className: 'dsh-collaboration-panel-login-title' }, notice && notice.message ? notice.message : 'Starting GitHub login…'), notice && notice.code && h('div', { className: 'dsh-collaboration-panel-code' }, notice.code), notice && notice.url && h('a', { href: notice.url, target: '_blank', rel: 'noreferrer' }, notice.url)),
    !error && !loggingIn && !items && h('div', { className: 'dsh-collaboration-panel-body' }, h('div', { className: 'dsh-collaboration-panel-status' }, h('div', { className: 'dsh-collaboration-panel-spinner', 'aria-hidden': true }), h('p', { className: 'dsh-collaboration-panel-status-title' }, 'Loading collaboration'), h('p', { className: 'dsh-collaboration-panel-status-desc' }, 'Fetching open issues and review requests from the repoList.'))),
    !error && !loggingIn && items && h('div', { className: 'dsh-collaboration-panel-body' }, h('div', { className: 'dsh-collaboration-panel-body-column' }, h(RepoErrors, { items }), h(BoardView, { items: boardItems, selected, onOpen: openRow }), detail && h('div', { className: 'dsh-collaboration-panel-detail' }, h('div', { className: 'dsh-collaboration-panel-detail-head' }, h('h3', { className: 'dsh-collaboration-panel-detail-title' }, detail.title), h('span', { className: 'dsh-collaboration-panel-state' }, detail.state)), h('div', { className: 'dsh-collaboration-panel-fields' }, h('span', { className: 'dsh-collaboration-panel-field' }, h('span', { className: 'dsh-collaboration-panel-dot', 'data-tone': 'red' }), `labels: ${detail.labels.join(', ') || '—'}`), h('span', { className: 'dsh-collaboration-panel-field' }, h('span', { className: 'dsh-collaboration-panel-dot', 'data-tone': 'yellow' }), `assignees: ${detail.assignees.join(', ') || '—'}`), h('span', { className: 'dsh-collaboration-panel-field' }, h('span', { className: 'dsh-collaboration-panel-dot', 'data-tone': 'green' }), `reviewers: ${detail.requestedReviewers.join(', ') || '—'}`)), h('pre', { className: 'dsh-collaboration-panel-detail-body' }, detail.body || '(no body)'), h('a', { href: detail.url, target: '_blank', rel: 'noreferrer' }, 'Open in GitHub')))),
  )
}
