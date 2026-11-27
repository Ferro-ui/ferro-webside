// Demo mode (?mock=1): reads the published content files from the site itself
// and keeps every change in memory. Nothing leaves the browser.

import {AdminError} from './errors.js'

export function createMockBackend({repo, branch}) {
  const files = new Map()        // path -> text at the tip
  const versions = new Map()     // path -> [{sha, date, author, message, text}]
  const uploads = new Set()
  const commits = []
  let tip = 'demo-0'
  let n = 0
  const started = new Date(Date.now() - 864e5).toISOString()

  return {
    mode: 'mock',
    repo, branch,
    restore: () => true,
    login: async () => ({}),
    user: async () => 'demo',
    logout() {},

    async load() {
      if (!files.size) {
        const res = await fetch('../content/index.json', {cache: 'no-store'})
        if (!res.ok) throw new AdminError('Fant ikke innholdet på nettstedet (content/index.json).')
        const index = await res.json()
        await Promise.all(index.files.map(async path => {
          const text = await (await fetch('../' + path, {cache: 'no-store'})).text()
          files.set(path, text)
          versions.set(path, [{sha: 'demo-0', date: started, author: 'ferro', message: 'Innhold fra nettstedet', text}])
        }))
      }
      return {head: tip, files: [...files].map(([path, text]) => ({path, text})), uploads: [...uploads]}
    },

    async commit({changes, message, base}) {
      if (base !== tip) throw new AdminError('Demo: grunnlaget er utdatert.')
      await new Promise(r => setTimeout(r, 400))
      tip = 'demo-' + (++n)
      const date = new Date().toISOString()
      for (const c of changes) {
        if (c.delete) { files.delete(c.path); continue }
        if (c.bytes) { uploads.add(c.path); continue }
        files.set(c.path, c.text)
        versions.set(c.path, [{sha: tip, date, author: 'demo', message, text: c.text}, ...(versions.get(c.path) || [])])
      }
      commits.push({sha: tip, date})
      return {commit: tip, url: ''}
    },

    async history(path) {
      return (versions.get(path) || []).map(({text, ...rest}) => rest)
    },
    async readAt(path, sha) {
      return (versions.get(path) || []).find(v => v.sha === sha)?.text ?? null
    },

    // A pretend build that takes about eight seconds.
    async run(commitSha) {
      const c = commits.find(x => x.sha === commitSha)
      if (!c) return {own: null, newest: null}
      const done = Date.now() - Date.parse(c.date) > 8000
      const own = {id: 1, sha: commitSha, status: done ? 'completed' : 'in_progress', conclusion: done ? 'success' : null, url: ''}
      return {own, newest: own}
    },

    imageUrl: path => '../' + path,
  }
}
