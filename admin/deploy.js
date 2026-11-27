// Publishing status in the header: after a publish, ask GitHub every 5 seconds
// for the Actions run of that commit, for at most 6 minutes.

import {h} from './dom.js'
import {store} from './store.js'

export function createDeployStatus() {
  const el = h('span', {class: 'deploy', role: 'status', 'aria-live': 'polite'})
  let watching = null

  function show(kind, text, url) {
    el.className = 'deploy deploy-' + kind
    el.replaceChildren(url ? h('a', {href: url, target: '_blank', rel: 'noopener'}, text) : text)
  }

  async function watch(commit) {
    watching = commit
    const started = Date.now()
    show('busy', 'Publiseres …')
    await new Promise(r => setTimeout(r, 5000))
    while (watching === commit && Date.now() - started < 6 * 60 * 1000) {
      let info
      try { info = await store.backend.run(commit) } catch {
        show('busy', 'Publiseres om ca. 1 min')   // token without Actions: Read
        return
      }
      const run = info.own
      if (run?.status === 'completed') {
        if (run.conclusion === 'success') return show('ok', 'Publisert ✓', store.config.siteUrl)
        if (run.conclusion === 'cancelled') {
          // A newer publish replaced this build; follow that one instead.
          if (info.newest && info.newest.sha !== commit) return watch(info.newest.sha)
          return show('busy', 'Publiseringen ble erstattet av en nyere')
        }
        return show('error', 'Publisering feilet', run.url)
      }
      show('busy', run?.status === 'in_progress' ? 'Publiseres … bygger nettstedet' : 'Publiseres …')
      await new Promise(r => setTimeout(r, 5000))
    }
    if (watching === commit) show('busy', 'Publiseringen tar lang tid. Sjekk Actions på GitHub.', `https://github.com/${store.config.repo}/actions`)
  }

  return {el, watch}
}
