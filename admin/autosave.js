// Unsaved edits are copied to localStorage a moment after each change, one key
// per file, and offered back after a reload, a closed tab or a conflict.

import {toFileText} from '../lib/util.mjs'

let prefix = 'ferro-admin:autosave:'
const timers = new Map()

export function init(scope) { prefix = `ferro-admin:autosave:${scope}:` }

export function schedule(doc) {
  clearTimeout(timers.get(doc))
  timers.set(doc, setTimeout(() => save(doc), 800))
}

export function save(doc) {
  try {
    const text = toFileText(doc.current)
    if (text === (doc.draftText ?? doc.publishedText)) localStorage.removeItem(prefix + doc.path)
    else localStorage.setItem(prefix + doc.path, JSON.stringify({path: doc.path, text, at: new Date().toISOString()}))
  } catch { /* storage full or blocked: editing still works */ }
}

export function flush(docs) { for (const doc of docs) { clearTimeout(timers.get(doc)); save(doc) } }

export function clear(doc) {
  clearTimeout(timers.get(doc))
  try { localStorage.removeItem(prefix + doc.path) } catch {}
}

export function entries() {
  const out = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key.startsWith(prefix)) continue
      try { out.push(JSON.parse(localStorage.getItem(key))) } catch {}
    }
  } catch {}
  return out
}

export function drop(path) { try { localStorage.removeItem(prefix + path) } catch {} }
