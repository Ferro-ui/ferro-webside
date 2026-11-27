// Reads and writes content through the GitHub REST API with a fine-grained token.
// Reading: ref -> tree -> blobs (blobs are addressed by hash, so no stale cache).
// Writing: one commit for many files via the Git Data API (blobs -> tree -> commit -> ref).

import {AdminError, ConflictError} from './errors.js'
import {bytesToBase64, decodeBase64, encodeBase64} from '../lib/util.mjs'

const TOKEN_KEY = 'ferro-admin-token'
const API = 'https://api.github.com'

export function createGithubBackend({repo, branch}) {
  let token = null
  const blobCache = new Map()

  async function req(method, path, body) {
    let res
    try {
      res = await fetch(API + path, {
        method, cache: 'no-store',
        headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? {'Content-Type': 'application/json'} : {})},
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new AdminError('Fikk ikke kontakt med GitHub. Sjekk nettforbindelsen og prøv igjen.')
    }
    if (res.status === 204) return null
    const data = await res.json().catch(() => ({}))
    if (res.ok) return data
    const err = new AdminError(explain(res.status, data))
    err.status = res.status
    throw err
  }

  function explain(status, data) {
    if (status === 401) return 'Tokenet er ugyldig eller utløpt. Lag et nytt token og logg inn igjen.'
    if (status === 403 && /rate limit/i.test(data.message || '')) return 'GitHub har midlertidig stoppet forespørslene (for mange på kort tid). Vent noen minutter.'
    if (status === 403) return 'Tokenet har ikke lov til dette. Det trenger «Contents: Read and write» for dette repoet.'
    if (status === 404) return 'Fant ikke filen eller repoet. Sjekk at tokenet gjelder ' + repo + '.'
    if (status === 409 || status === 422) return 'GitHub avviste endringen: ' + (data.message || status)
    return 'GitHub svarte med feil ' + status + (data.message ? ': ' + data.message : '.')
  }

  const r = path => `/repos/${repo}${path}`

  async function head() {
    const ref = await req('GET', r(`/git/ref/heads/${encodeURIComponent(branch)}?t=${Date.now()}`))
    return ref.object.sha
  }

  async function blob(sha) {
    if (!blobCache.has(sha)) blobCache.set(sha, req('GET', r(`/git/blobs/${sha}`)).then(b => decodeBase64(b.content)))
    return blobCache.get(sha)
  }

  async function pool(items, size, fn) {
    const out = new Array(items.length)
    let next = 0
    await Promise.all(Array.from({length: Math.min(size, items.length)}, async () => {
      while (next < items.length) { const i = next++; out[i] = await fn(items[i]) }
    }))
    return out
  }

  return {
    mode: 'github',
    repo, branch,

    restore() {
      token = sessionStorage.getItem(TOKEN_KEY)
      return !!token
    },

    async login(value) {
      token = String(value || '').trim()
      if (!token) throw new AdminError('Lim inn tokenet først.')
      let info
      try { info = await req('GET', r('')) } catch (e) {
        token = null
        if (e.status === 404) throw new AdminError('Tokenet gir ikke tilgang til ' + repo + '. Velg dette repoet under «Only select repositories».')
        throw e
      }
      if (!info.permissions?.push) {
        token = null
        throw new AdminError('Tokenet kan bare lese. Gi det «Contents: Read and write» for ' + repo + ', og velg «Only select repositories» (ikke «Public repositories», som bare kan lese).')
      }
      sessionStorage.setItem(TOKEN_KEY, token)
      return info
    },

    async user() {
      try { return (await req('GET', '/user')).login } catch { return '' }
    },

    logout() {
      token = null
      sessionStorage.removeItem(TOKEN_KEY)
    },

    // Every content JSON file at the tip of the branch.
    async load() {
      const sha = await head()
      const commit = await req('GET', r(`/git/commits/${sha}`))
      const tree = await req('GET', r(`/git/trees/${commit.tree.sha}?recursive=1`))
      if (tree.truncated) throw new AdminError('Repoet er for stort til å lese på én gang.')
      const files = tree.tree.filter(e => e.type === 'blob' && /^content\/.+\.json$/.test(e.path))
      const uploads = tree.tree.filter(e => e.type === 'blob' && e.path.startsWith('content/uploads/')).map(e => e.path)
      const texts = await pool(files, 6, e => blob(e.sha))
      return {head: sha, files: files.map((e, i) => ({path: e.path, text: texts[i]})), uploads}
    },

    // changes: [{path, text} | {path, bytes} | {path, delete: true}]
    async commit({changes, message, base}) {
      let tip = await head()
      if (tip !== base) {
        // Someone else committed. Go on only if none of our files were touched.
        const cmp = await req('GET', r(`/compare/${base}...${tip}`))
        const touched = new Set((cmp.files || []).flatMap(f => [f.filename, f.previous_filename]).filter(Boolean))
        if (cmp.status === 'diverged' || changes.some(c => touched.has(c.path))) throw new ConflictError()
      }
      const parent = await req('GET', r(`/git/commits/${tip}`))
      const entries = await pool(changes, 4, async c => {
        if (c.delete) return {path: c.path, mode: '100644', type: 'blob', sha: null}
        const content = c.bytes ? bytesToBase64(c.bytes) : encodeBase64(c.text)
        const b = await req('POST', r('/git/blobs'), {content, encoding: 'base64'})
        return {path: c.path, mode: '100644', type: 'blob', sha: b.sha}
      })
      const tree = await req('POST', r('/git/trees'), {base_tree: parent.tree.sha, tree: entries})
      const commit = await req('POST', r('/git/commits'), {message, tree: tree.sha, parents: [tip]})
      try {
        await req('PATCH', r(`/git/refs/heads/${encodeURIComponent(branch)}`), {sha: commit.sha, force: false})
      } catch (e) {
        if (e.status === 422 || e.status === 409) throw new ConflictError()
        throw e
      }
      return {commit: commit.sha, url: commit.html_url}
    },

    async history(path) {
      const list = await req('GET', r(`/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(branch)}&per_page=30&t=${Date.now()}`))
      return list.map(c => ({sha: c.sha, date: c.commit.author.date, author: c.author?.login || c.commit.author.name, message: c.commit.message.split('\n')[0], url: c.html_url}))
    },

    async readAt(path, sha) {
      try {
        const f = await req('GET', r(`/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`))
        return decodeBase64(f.content)
      } catch (e) { if (e.status === 404) return null; throw e }
    },

    // The Actions run for a commit, or the newest run when that one was replaced.
    async run(commitSha) {
      const data = await req('GET', r(`/actions/runs?branch=${encodeURIComponent(branch)}&event=push&per_page=10&t=${Date.now()}`))
      const runs = data.workflow_runs || []
      const own = runs.find(x => x.head_sha === commitSha)
      return {own: own && pick(own), newest: runs[0] && pick(runs[0])}
    },

    imageUrl(path) {
      return path.startsWith('content/uploads/') ? `https://raw.githubusercontent.com/${repo}/${branch}/${path}` : '../' + path
    },
  }
}

const pick = x => ({id: x.id, sha: x.head_sha, status: x.status, conclusion: x.conclusion, url: x.html_url, created: x.created_at})
